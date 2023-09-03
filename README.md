# Connecting ESP32 to MQTT to Express.js backend

This guide offers a simulation into a real-time card transaction system built around the MQTT protocol with an Express.js backend and an Arduino-based device as the client.

## Table of Contents

- [Overview](#overview)
- [Components](#components)
  - [Arduino Device](#arduino-device)
  - [MQTT Broker](#mqtt-broker)
  - [Express.js Backend](#expressjs-backend)
- [Data Flow](#data-flow)
- [Other Implementations](#other-implementations)
- [Further Implementations & Considerations](#further-implementations--considerations)
  - [WebSockets for Enhanced Real-time Interaction](#websockets-for-enhanced-real-time-interaction)
  - [Automated Transaction Decision](#automated-transaction-decision)
  - [Handling Multiple Concurrent Transactions](#handling-multiple-concurrent-transactions)
- [Note on Express.js Backend](#note-on-expressjs-backend)


## Overview

The system is structured to allow an Arduino device to send transaction requests and receive responses from a central server. The server processes these requests and provides an interface for human operators to approve or deny the transactions to simulate backend processing of a transaction.

## Components

### Arduino Device

- Acts as both a publisher and subscriber within the MQTT system.

**Role as a Publisher:**

- It sends transaction requests when a button is pressed.

**Role as a Subscriber:**

- It listens for transaction responses to understand whether a request was approved or denied.

### MQTT Broker

A server that facilitates MQTT communication. It handles:

- Receiving messages from publishers.
- Distributing messages to the appropriate subscribers.

### Express.js Backend

Acts as the interface between human operators and the MQTT system. Also behaves as both a *publisher* and *subscriber*.

**Role as a Subscriber:**

- It listens for transaction requests from the Arduino device.

**Role as a Publisher:**

- Sends transaction responses after an operator decision.

## Data Flow

1. **Button Pressed on Arduino:** A transaction request is formed with details like the card ID and timestamp. This message is then published to the card/transaction/request topic.

1. **MQTT Broker Relay:** The broker receives the published message and relays it to all subscribers of card/transaction/request.

1. **Express.js Backend Receives Transaction:** Since the backend is subscribed to card/transaction/request, it gets the message. The transaction details are added to the pendingTransactions list for operators to view.

1. **Decision Making on the Backend:** Operators can view pending transactions via the web interface and decide to approve or deny them. Once a decision is made, the backend publishes a response to card/transaction/response.

1. **Arduino Device Gets Response:** The device, subscribed to card/transaction/response, receives the response and acts accordingly, informing the user if their transaction was approved or denied.

## Other Implementations

An MQTT broker would need to be setup for the entire process to work. Currently I have setup the broker using a VM in a docker container. The Express.js app is also implemented by way of docker container. End to end testing has been carried out successfully.

## Further Implementations & Considerations

### WebSockets for Enhanced Real-time Interaction

While the current system effectively handles real-time data movement using MQTT, further enhancements can be made by incorporating WebSockets. WebSockets can ensure that the operator's interface in the Express.js backend instantly reflects new transactions without requiring manual refreshes.

### Automated Transaction Decision

Currently, the system is designed to allow human operators to decide on transactions. However, in real-world applications, this decision could be automated. By utilizing timestamps and pre-defined criteria, transactions could be auto-approved or denied without human intervention. The Express.js frontend, in this proof-of-concept, serves mainly to visualize data movements and simulate data consumption from the MQTT broker.

### Handling Multiple Concurrent Transactions

In the current prototype, the system displays a message — "Received approval from backend server" or "Received denial from backend server" — only for the last card that was sent. In a real-world setting, an IoT device would process a single card transaction to completion before initiating another. Simulating multiple transactions, as done in this prototype, is a way to test the broker's scalability.

**To make the system more robust:**

1. **Transaction Blocking:** Implement a mechanism to prevent a new card from being scanned while a transaction from the previous card is still ongoing.

1. **Transaction Cancellation:** Offer a means to cancel an ongoing transaction to free up the device for the next card.

## Note on Express.js Backend

This project's primary goal is to rapidly prototype and demonstrate data transfer from IoT devices to an MQTT broker and then to a backend, therefore, the intricacies of the Express.js portion will not be delved into in-depth in this guide.










