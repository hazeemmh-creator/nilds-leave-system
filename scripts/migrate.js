const { Client, Databases, ID } = require('node-appwrite');
const xlsx = require('xlsx');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

// The Magic Fix: A function to pause the script
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 1. Initialize the Admin Bridge
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

async function runMigration() {
  console.log('Initializing mass data transfer, Chief... 🚀');

  try {
    // 2. Read the Excel Directory
    const filePath = path.resolve(__dirname, '../Staff Directory 2026 (LEAVE SCHEDULE).xlsx');
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const staffList = xlsx.utils.sheet_to_json(sheet);

    console.log(`Found ${staffList.length} staff members. Commencing upload with network throttling...`);

    // 3. Process the Records
    let successCount = 0;
    const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
    const collectionId = process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_ID;

    for (const staff of staffList) {
      try {
        await databases.createDocument(
          databaseId,
          collectionId,
          ID.unique(),
          {
            staff_name: String(staff['STAFF NAME']),
            designation: String(staff['DESIGNATION']),
            annual_leave_balance: 14 // Standard default base
          }
        );
        successCount++;
        console.log(`✅ Uploaded: ${staff['STAFF NAME']}`);
        
        // Wait 250 milliseconds before sending the next one
        await sleep(250); 

      } catch (itemError) {
        console.error(`⚠️ Failed to upload ${staff['STAFF NAME']}:`, itemError.message);
      }
    }

    console.log(`\nMigration complete! Successfully secured ${successCount} profiles in the vault.`);
  } catch (error) {
    console.error('\n❌ Error during migration setup:', error.message);
  }
}

runMigration();