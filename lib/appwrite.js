import { Client, Account, Databases, Teams } from 'appwrite';

const client = new Client();

client
  .setEndpoint(String(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT))
  .setProject(String(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID));

export const account = new Account(client);
export const databases = new Databases(client);
export const teams = new Teams(client);

export default client;
