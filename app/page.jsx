'use client';

import { useEffect, useState } from 'react';
import { databases } from '../lib/appwrite';

export default function Dashboard() {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStaff() {
      try {
        const response = await databases.listDocuments(
          String(process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID),
          String(process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_ID)
        );
        setStaffList(response.documents);
      } catch (error) {
        console.error('Error fetching staff vault:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchStaff();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-4">
          NILDS Leave Management System
        </h1>
        
        {loading ? (
          <div className="flex justify-center items-center py-10">
            <p className="text-gray-500 font-medium animate-pulse">Loading staff profiles from vault...</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {staffList.map((staff) => (
              <div key={staff.$id} className="p-4 border rounded-md flex justify-between items-center bg-gray-50 hover:bg-gray-100 transition-colors">
                <div>
                  <p className="font-semibold text-gray-900">{staff.staff_name}</p>
                  <p className="text-sm text-gray-600">{staff.designation}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Leave Balance</p>
                  <p className="font-bold text-blue-600 text-lg">{staff.annual_leave_balance} Days</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}