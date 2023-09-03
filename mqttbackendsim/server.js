const express = require('express');
const mqtt = require('mqtt');
const bodyParser = require('body-parser');

const app = express();

// MQTT credentials (change to your own)
const mqttUsername = 'MQTT_USERNAME';
const mqttPassword = 'MQTT_PASSWORD';
// MQTT broker IP address (change to your own)
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
    }
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

app.listen(2999, () => console.log('Backend simulation running on http://localhost:2999'));
