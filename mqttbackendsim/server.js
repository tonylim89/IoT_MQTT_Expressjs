const express = require('express');
const mqtt = require('mqtt');
const bodyParser = require('body-parser');
const WebSocket = require('ws');

const http = require('http');
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });


// MQTT credentials 
const mqttUsername = 'MQTT_USERNAME';
const mqttPassword = 'MQTT_PASSWORD';
// MQTT broker IP address 
const client = mqtt.connect('mqtt://MQTT_IP', {
    username: mqttUsername,
    password: mqttPassword
});

app.use(bodyParser.urlencoded({ extended: true }));

let pendingTransactions = [];  // To store the pending transactions

client.on('connect', function() {
    client.subscribe('card/transaction/request', function(err) {
        if (!err) console.log('Subscribed to card transaction requests');
    });
});

client.on('message', function(topic, message) {
    if (topic === 'card/transaction/request') {
        const transaction = JSON.parse(message);
        pendingTransactions.push(transaction);
        console.log(`Received a transaction request from card ID: ${transaction.cardID}`);
        // Notify all WebSocket clients about the new transaction
        wss.clients.forEach(function each(client) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(transaction));
            }
        });
    }
});

wss.on('connection', ws => {
    console.log('Client connected');
    ws.on('close', () => console.log('Client disconnected'));
});

app.get('/', (req, res) => {
    // Display the list of pending transactions in a table
    const transactionListHtml = `
        <table>
            <thead>
                <tr>
                    <th>Card ID</th>
                    <th>Timestamp</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${pendingTransactions.map(transaction => `
                    <tr>
                        <td>${transaction.cardID}</td>
                        <td>${transaction.timestamp}</td>
                        <td>
                            <button onclick="fetch('/decide?cardID=${transaction.cardID}&status=approved')">Approve</button>
                            <button onclick="fetch('/decide?cardID=${transaction.cardID}&status=denied')">Deny</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        `;
        //WebSocket script to refresh the page when a new transaction comes in
        const wsScript = `
        <script>
            const ws = new WebSocket(((window.location.protocol === "https:") ? "wss://" : "ws://") + window.location.host);

            ws.onmessage = function(event) {
                const transaction = JSON.parse(event.data);
                console.log('New transaction received:', transaction);
                addTransactionToTable(transaction);
            };
            
            function addTransactionToTable(transaction) {
                const table = document.querySelector("tbody");
                const newRow = document.createElement("tr");
                
                const cardIdCell = document.createElement("td");
                cardIdCell.innerText = transaction.cardID;
                newRow.appendChild(cardIdCell);
                
                const timestampCell = document.createElement("td");
                timestampCell.innerText = transaction.timestamp;
                newRow.appendChild(timestampCell);
                
                const actionsCell = document.createElement("td");
                
                const approveButton = document.createElement("button");
                approveButton.innerText = "Approve";
                approveButton.onclick = function() {
                    fetch('/decide?cardID=' + transaction.cardID + '&status=approved');
                    newRow.remove(); // remove the row once decision is made
                };
                actionsCell.appendChild(approveButton);
                
                const denyButton = document.createElement("button");
                denyButton.innerText = "Deny";
                denyButton.onclick = function() {
                    fetch('/decide?cardID=' + transaction.cardID + '&status=denied');
                    newRow.remove(); // remove the row once decision is made
                };
                actionsCell.appendChild(denyButton);
                
                newRow.appendChild(actionsCell);
                table.appendChild(newRow);
            }
        </script>
    `;

    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
        <style>
        body {
            font-family: Arial, sans-serif;
            text-align: center;
            margin-top: 50px;
        }
        table {
            width: 80%;
            margin-left: auto;
            margin-right: auto;
            border-collapse: collapse;
        }
        th, td {
            padding: 15px;
            border: 1px solid #ddd;
        }
        th {
            background-color: #f2f2f2;
        }
    </style>
        </head>
        <body>
            <h2>Card Transaction Decision</h2>
            ${transactionListHtml}
            ${wsScript}
        </body>
        </html>
    `);
});

app.get('/decide', (req, res) => {
    const status = req.query.status || 'denied';
    const cardID = req.query.cardID;
    
    // Remove the transaction from the pending list
    const transactionIndex = pendingTransactions.findIndex(t => t.cardID === cardID);
    if (transactionIndex > -1) {
        pendingTransactions.splice(transactionIndex, 1);

        // Publish the response for the specific card ID
        client.publish('card/transaction/response', JSON.stringify({ cardID: cardID, status: status }), { qos: 1 });
    }

    res.redirect('/');
});

server.listen(2999, () => console.log('Backend simulation running on http://localhost:2999'));