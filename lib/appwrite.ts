import { Client, Account, Databases } from 'appwrite';

// 1. Initialize the Appwrite client
const client = new Client();

client
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT as string)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID as string);

// 2. Export the services we need to use across the app
export const account = new Account(client);
export const databases = new Databases(client);

export default client;