#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <NTPClient.h>

WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org"); // NTP server
const long GMT_OFFSET = 28800; // 8 hours in seconds for sg time

// Replace with your network details
const char* ssid = "WIFI_SSID";
const char* password = "WIFI_PASSWORD";

// Replace with your MQTT broker's IP
const char* mqttServer = "MQTT_SERVER_IP";
const int mqttPort = 1883;
const char* mqttUser = "MQTT_USERNAME";
const char* mqttPassword = "MQTT_PASSWORD";

WiFiClient espClient;
PubSubClient client(espClient);

const int buttonPin = 2;
int buttonState = 0;
int lastButtonState = 1;
String lastCardID = "";

void setup() {
  Serial.begin(115200);
  pinMode(buttonPin, INPUT_PULLUP);
  
  setupWiFi();
  client.setServer(mqttServer, mqttPort);
  client.setCallback(callback);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  timeClient.update(); // Update NTP client
  client.loop();

  buttonState = digitalRead(buttonPin);
  
  if (buttonState == LOW && lastButtonState == HIGH) {
    Serial.println("Button Pressed!");

    // Generate a random 10-digit card ID
    lastCardID = String(random(1000000000, 10000000000));

    unsigned long epochTime = timeClient.getEpochTime();
    String currentDatetime = getFormattedDateTime(epochTime);

    String message = "{ \"cardID\": \"" + lastCardID + "\", \"timestamp\": \"" + currentDatetime + "\" }";
    client.publish("card/transaction/request", message.c_str(), 1); // Added QoS level
    
    delay(200);
  }
  
  lastButtonState = buttonState;
  
  delay(10);
}

void setupWiFi() {
  delay(10);
  Serial.println("Connecting to WiFi...");

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Setting up WiFi...");
  }

  Serial.println("WiFi connected");

  // Start NTP client
  timeClient.begin();
  timeClient.setTimeOffset(GMT_OFFSET);
}

void callback(char* topic, byte* payload, unsigned int length) {
    Serial.print("Message arrived in topic: ");
    Serial.println(topic);

    String message = "";
    for (int i = 0; i < length; i++) {
        message += (char)payload[i];
    }
    
    // Convert message to JSON for parsing
    DynamicJsonDocument doc(256);
    deserializeJson(doc, message);
    
    String status = doc["status"].as<String>();
    String cardID = doc["cardID"].as<String>();

    if (String(topic) == "card/transaction/response" && cardID == lastCardID) {
        if (status == "approved") {
            Serial.println("Received approval from backend server");
        } else if (status == "denied") {
            Serial.println("Received denial from backend server");
        }
    }
}

String getFormattedDateTime(unsigned long epochTime) {
    time_t rawtime = epochTime;
    struct tm * ti;
    ti = localtime(&rawtime);
    char buffer[30];
    strftime(buffer, sizeof(buffer), "%Y-%m-%d %H:%M:%S", ti);
    return String(buffer);
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    if (client.connect("ESP32Client", mqttUser, mqttPassword)) {
      Serial.println("connected");
      client.subscribe("card/transaction/response", 1); // Added QoS level
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}