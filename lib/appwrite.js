import { Client, Account, Databases } from 'appwrite';

// 1. Initialize the Appwrite client
const client = new Client();

client
  .setEndpoint(String(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT))
  .setProject(String(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID));

// 2. Export the services we need to use across the app
export const account = new Account(client);
export const databases = new Databases(client);

export default client;