# Use an official Node.js runtime as the base image
FROM node:18.12.0

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy the package.json and package-lock.json files to the container
COPY package*.json ./

# Install the application dependencies inside the container
RUN npm install

# Copy the rest of the application code into the container
COPY . .

# Expose the port your application runs on
EXPOSE 2999

# Define the command to run the application
CMD ["npm", "start"]
