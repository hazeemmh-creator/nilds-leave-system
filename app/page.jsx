'use client';

import { useEffect, useState } from 'react';
import { databases } from '../lib/appwrite';
import { ID, Query } from 'appwrite';
import { Users, CalendarDays, ClipboardCheck, Search, Filter, MoreHorizontal, X, Briefcase, Calendar, CheckCircle, Plus, Clock } from 'lucide-react';

export default function Dashboard() {
  const [staffList, setStaffList] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Slide-Over State
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // New Leave Request Modal State
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    staffId: '',
    leaveType: 'Annual Leave',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch both vaults simultaneously with expanded limits!
        const [staffResponse, leaveResponse] = await Promise.all([
          databases.listDocuments(
            String(process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID),
            String(process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_ID),
            [Query.limit(500)] // Unlocks the 25-record limit
          ),
          databases.listDocuments(
            String(process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID),
            String(process.env.NEXT_PUBLIC_APPWRITE_LEAVE_COLLECTION_ID),
            [Query.limit(500)]
          )
        ]);
        
        setStaffList(staffResponse.documents);
        setLeaveRequests(leaveResponse.documents);
      } catch (error) {
        console.error('Error fetching vaults:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const pendingApprovalsCount = leaveRequests.filter(req => req.status === 'Pending Approval').length;
  const activeOnLeaveCount = leaveRequests.filter(req => req.status === 'Approved').length; 

  const filteredStaff = staffList.filter(staff => 
    staff.staff_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    staff.designation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openStaffPanel = (staff) => {
    setSelectedStaff(staff);
    setIsPanelOpen(true);
  };

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const selectedStaffMember = staffList.find(s => s.$id === formData.staffId);

      const newRequest = await databases.createDocument(
        String(process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID),
        String(process.env.NEXT_PUBLIC_APPWRITE_LEAVE_COLLECTION_ID),
        ID.unique(),
        {
          staff_id: formData.staffId,
          staff_name: selectedStaffMember.staff_name,
          leave_type: formData.leaveType,
          start_date: formData.startDate,
          end_date: formData.endDate,
          status: 'Pending Approval'
        }
      );
      
      setLeaveRequests(prev => [newRequest, ...prev]);
      setFormData({ staffId: '', leaveType: 'Annual Leave', startDate: '', endDate: '' });
      setIsLeaveModalOpen(false);
      alert('Leave Request Successfully Logged into the Vault! ✅');
      
    } catch (error) {
      console.error('Error submitting leave request:', error);
      alert('Failed to submit leave request. Please check your Appwrite permissions.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-200/60 p-6 md:p-10 font-sans relative overflow-hidden flex flex-col">
      <div className="max-w-7xl mx-auto w-full space-y-6 flex-1 flex flex-col">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">NILD HR Portal</h1>
            <p className="text-slate-500 mt-1">Manage staff leave schedules and balances</p>
            <p className="text-xs text-emerald-700 font-semibold mt-2 tracking-wide uppercase">Engineered by Hawea-Heritage</p>
          </div>
          <button 
            onClick={() => setIsLeaveModalOpen(true)}
            className="flex items-center space-x-2 bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
          >
            <Plus size={18} />
            <span>New Leave Request</span>
          </button>
        </div>

        {/* Statistical Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
          <div className="bg-slate-50 p-6 rounded-xl shadow-sm border border-slate-200/60 flex items-center space-x-4">
            <div className="p-3 bg-emerald-100/50 text-emerald-700 rounded-lg">
              <Users size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Staff</p>
              <h3 className="text-2xl font-bold text-slate-800">{loading ? '...' : staffList.length}</h3>
            </div>
          </div>
          <div className="bg-slate-50 p-6 rounded-xl shadow-sm border border-slate-200/60 flex items-center space-x-4">
            <div className="p-3 bg-slate-200/50 text-slate-700 rounded-lg">
              <CalendarDays size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Active on Leave</p>
              <h3 className="text-2xl font-bold text-slate-800">{loading ? '...' : activeOnLeaveCount}</h3>
            </div>
          </div>
          <div className="bg-slate-50 p-6 rounded-xl shadow-sm border border-slate-200/60 flex items-center space-x-4">
            <div className="p-3 bg-amber-100/50 text-amber-700 rounded-lg">
              <ClipboardCheck size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Pending Approvals</p>
              <h3 className="text-2xl font-bold text-slate-800">{loading ? '...' : pendingApprovalsCount}</h3>
            </div>
          </div>
        </div>

        {/* Main Data Table Section */}
        <div className="bg-slate-50 rounded-xl shadow-sm border border-slate-200/60 flex flex-col flex-1 overflow-hidden min-h-[400px]">
          <div className="p-5 border-b border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 shrink-0">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search by name or designation..." 
                className="w-full pl-10 pr-4 py-2.5 bg-slate-100/50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition-all text-sm text-slate-700"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="flex items-center space-x-2 text-slate-600 hover:text-slate-800 px-4 py-2.5 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors text-sm font-medium">
              <Filter size={16} />
              <span>Filter</span>
            </button>
          </div>

          {/* Scrollable Container with Sticky Header */}
          <div className="overflow-y-auto flex-1 relative custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur-sm shadow-sm">
                <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200/60">
                  <th className="px-6 py-4 font-semibold">Staff Name</th>
                  <th className="px-6 py-4 font-semibold">Designation</th>
                  <th className="px-6 py-4 font-semibold text-center">Leave Balance</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60">
                {loading ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-slate-500">
                      <div className="flex justify-center items-center space-x-2">
                        <div className="w-5 h-5 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin"></div>
                        <span>Loading enterprise vault...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-slate-500">
                      No staff members found matching "{searchQuery}"
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((staff) => (
                    <tr 
                      key={staff.$id} 
                      onClick={() => openStaffPanel(staff)}
                      className="hover:bg-slate-100/80 transition-colors group cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-800 group-hover:text-emerald-700 transition-colors">{staff.staff_name}</div>
                        <div className="text-xs text-slate-400 mt-0.5">ID: {staff.$id.substring(0, 8)}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{staff.designation}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                          {staff.annual_leave_balance} Days
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-slate-400 hover:text-emerald-700 transition-colors p-1 rounded-md hover:bg-emerald-50">
                          <MoreHorizontal size={20} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* --- Leave Request Modal --- */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsLeaveModalOpen(false)}></div>
          
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">Log New Leave Request</h2>
              <button onClick={() => setIsLeaveModalOpen(false)} className="text-slate-400 hover:text-slate-700 hover:bg-slate-200 p-1.5 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleLeaveSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Select Staff Member</label>
                <select 
                  required
                  value={formData.staffId}
                  onChange={(e) => setFormData({...formData, staffId: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition-all text-sm text-slate-700"
                >
                  <option value="" disabled>-- Select Staff --</option>
                  {staffList.map(staff => (
                    <option key={staff.$id} value={staff.$id}>{staff.staff_name} ({staff.designation})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Leave Type</label>
                <select 
                  required
                  value={formData.leaveType}
                  onChange={(e) => setFormData({...formData, leaveType: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition-all text-sm text-slate-700"
                >
                  <option value="Annual Leave">Annual Leave</option>
                  <option value="Sick Leave">Sick Leave</option>
                  <option value="Maternity Leave">Maternity Leave</option>
                  <option value="Compassionate Leave">Compassionate Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Start Date</label>
                  <input 
                    type="date" 
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition-all text-sm text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">End Date</label>
                  <input 
                    type="date" 
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition-all text-sm text-slate-700"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
                <button 
                  type="button" 
                  onClick={() => setIsLeaveModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-sm font-medium bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Slide-Over Panel --- */}
      {isPanelOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsPanelOpen(false)}
        />
      )}

      <div 
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-md bg-slate-50 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${
          isPanelOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {selectedStaff && (
          <>
            <div className="px-6 py-5 border-b border-slate-200/60 flex justify-between items-center bg-slate-100/50">
              <h2 className="text-lg font-semibold text-slate-800">Staff Details</h2>
              <button 
                onClick={() => setIsPanelOpen(false)}
                className="text-slate-400 hover:text-slate-700 hover:bg-slate-200 p-1.5 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="flex items-center space-x-4 pb-6 border-b border-slate-200/60">
                <div className="w-16 h-16 bg-emerald-100/60 text-emerald-700 rounded-full flex items-center justify-center text-2xl font-bold border border-emerald-200/50">
                  {selectedStaff.staff_name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">{selectedStaff.staff_name}</h3>
                  <div className="flex items-center text-slate-500 mt-1 text-sm">
                    <Briefcase size={14} className="mr-1.5" />
                    {selectedStaff.designation}
                  </div>
                </div>
              </div>

              <div className="bg-slate-100/80 border border-slate-200/60 rounded-xl p-5 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-slate-700">Available Balance</p>
                  <p className="text-xs text-slate-500 mt-0.5">Annual Leave for 2026</p>
                </div>
                <div className="text-3xl font-bold text-emerald-700">
                  {selectedStaff.annual_leave_balance} <span className="text-base font-medium">Days</span>
                </div>
              </div>

              <div className="pt-2">
                <h4 className="text-sm font-semibold text-slate-800 mb-4 flex items-center">
                  <Clock size={16} className="mr-2 text-slate-500" />
                  Recent Leave Activity
                </h4>
                <div className="space-y-3">
                  {leaveRequests.filter(req => req.staff_id === selectedStaff.$id).length === 0 ? (
                    <p className="text-sm text-slate-500 italic bg-slate-100/50 p-4 rounded-lg border border-slate-200/50 text-center">
                      No leave requests found for this staff member.
                    </p>
                  ) : (
                    leaveRequests
                      .filter(req => req.staff_id === selectedStaff.$id)
                      .map(request => (
                        <div key={request.$id} className="bg-white p-4 rounded-lg border border-slate-200/80 shadow-sm flex flex-col gap-2">
                          <div className="flex justify-between items-start">
                            <span className="text-sm font-medium text-slate-800">{request.leave_type}</span>
                            <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${
                              request.status === 'Pending Approval' ? 'bg-amber-100 text-amber-700' :
                              request.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                              'bg-rose-100 text-rose-700'
                            }`}>
                              {request.status}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 flex justify-between">
                            <span>From: {request.start_date}</span>
                            <span>To: {request.end_date}</span>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>

            </div>
          </>
        )}
      </div>
    </div>
  );
}