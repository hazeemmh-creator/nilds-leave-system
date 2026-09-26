'use client';

import { useEffect, useMemo, useState } from 'react';
import { databases } from '../lib/appwrite';
import { ID, Query } from 'appwrite';
import {
  Users,
  CalendarDays,
  ClipboardCheck,
  Search,
  Filter,
  MoreHorizontal,
  X,
  Briefcase,
  Plus,
  Clock,
  CheckCircle,
  Upload
} from 'lucide-react';
import { useAuth } from '../components/AuthProvider';
import AppHeader from '../components/AppHeader';
import { findLinkedStaff } from '../lib/staff';

export default function Dashboard() {
  const { user, permissions } = useAuth();
  const [staffList, setStaffList] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');

  const [selectedStaff, setSelectedStaff] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    staffId: '',
    leaveType: 'Annual Leave',
    startDate: '',
    endDate: ''
  });

  const linkedStaff = useMemo(() => findLinkedStaff(staffList, user), [staffList, user]);
  const visibleStaff = permissions.canViewAllStaff
    ? staffList
    : linkedStaff
      ? [linkedStaff]
      : [];

  const visibleLeaveRequests = useMemo(() => {
    if (permissions.canViewAllStaff) {
      return leaveRequests;
    }

    if (!linkedStaff) {
      return [];
    }

    return leaveRequests.filter((request) => request.staff_id === linkedStaff.$id);
  }, [leaveRequests, linkedStaff, permissions.canViewAllStaff]);

  useEffect(() => {
    async function fetchData() {
      const databaseId = String(process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID);
      const staffCollectionId = String(process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_ID);
      const leaveCollectionId = String(process.env.NEXT_PUBLIC_APPWRITE_LEAVE_COLLECTION_ID);

      try {
        if (permissions.canViewAllStaff) {
          const [staffResponse, leaveResponse] = await Promise.all([
            databases.listDocuments(databaseId, staffCollectionId, [Query.limit(500)]),
            databases.listDocuments(databaseId, leaveCollectionId, [Query.limit(500)])
          ]);

          setStaffList(staffResponse.documents);
          setLeaveRequests(leaveResponse.documents);
          return;
        }

        let ownStaff = [];

        try {
          if (user?.email) {
            const emailMatch = await databases.listDocuments(databaseId, staffCollectionId, [
              Query.equal('email', user.email),
              Query.limit(5)
            ]);
            ownStaff = emailMatch.documents;
          }
        } catch {
          ownStaff = [];
        }

        if (ownStaff.length === 0 && user?.$id) {
          try {
            const userMatch = await databases.listDocuments(databaseId, staffCollectionId, [
              Query.equal('user_id', user.$id),
              Query.limit(5)
            ]);
            ownStaff = userMatch.documents;
          } catch {
            ownStaff = [];
          }
        }

        if (ownStaff.length === 0 && user?.name) {
          try {
            const nameMatch = await databases.listDocuments(databaseId, staffCollectionId, [
              Query.equal('staff_name', user.name),
              Query.limit(5)
            ]);
            ownStaff = nameMatch.documents;
          } catch {
            ownStaff = [];
          }
        }

        setStaffList(ownStaff);

        const ownRecord = findLinkedStaff(ownStaff, user);
        if (!ownRecord) {
          setLeaveRequests([]);
          return;
        }

        const leaveResponse = await databases.listDocuments(databaseId, leaveCollectionId, [
          Query.equal('staff_id', ownRecord.$id),
          Query.limit(500)
        ]);
        setLeaveRequests(leaveResponse.documents);
      } catch (error) {
        console.error('Error fetching vaults:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [permissions.canViewAllStaff, user]);

  const pendingApprovalsCount = visibleLeaveRequests.filter((req) => req.status === 'Pending Approval').length;
  const activeOnLeaveCount = visibleLeaveRequests.filter((req) => req.status === 'Approved').length;

  const filteredStaff = visibleStaff.filter((staff) =>
    staff.staff_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    staff.designation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openStaffPanel = (staff) => {
    setSelectedStaff(staff);
    setIsPanelOpen(true);
  };

  const openLeaveModal = () => {
    setFormData({
      staffId: permissions.canViewAllStaff ? '' : linkedStaff?.$id || '',
      leaveType: 'Annual Leave',
      startDate: '',
      endDate: ''
    });
    setIsLeaveModalOpen(true);
  };

  const handleLeaveSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const selectedStaffMember = staffList.find((staff) => staff.$id === formData.staffId);

      if (!permissions.canViewAllStaff && linkedStaff && formData.staffId !== linkedStaff.$id) {
        throw new Error('You can only submit leave for your own record.');
      }

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

      setLeaveRequests((prev) => [newRequest, ...prev]);
      setFormData({ staffId: '', leaveType: 'Annual Leave', startDate: '', endDate: '' });
      setIsLeaveModalOpen(false);
      setStatusMessage('Leave request submitted successfully.');
    } catch (error) {
      console.error('Error submitting leave request:', error);
      setStatusMessage(error?.message || 'Failed to submit leave request. Please check your Appwrite permissions.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateLeaveStatus = async (requestId, status) => {
    if (!permissions.canApprove) {
      return;
    }

    try {
      const updated = await databases.updateDocument(
        String(process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID),
        String(process.env.NEXT_PUBLIC_APPWRITE_LEAVE_COLLECTION_ID),
        requestId,
        { status }
      );

      setLeaveRequests((prev) => prev.map((request) => (request.$id === requestId ? { ...request, ...updated } : request)));
      setStatusMessage(`Leave request marked as ${status}.`);
    } catch (error) {
      console.error('Error updating leave status:', error);
      setStatusMessage('Unable to update leave status. Check Appwrite document permissions.');
    }
  };

  const handleImportClick = () => {
    if (!permissions.canImport) {
      return;
    }

    setStatusMessage('Staff import is available to HR and Admin via the migration script (scripts/migrate.js).');
  };

  const canCreateLeave = permissions.canViewAllStaff || Boolean(linkedStaff);

  return (
    <div className="min-h-screen bg-slate-200/60 p-6 md:p-10 font-sans relative overflow-hidden flex flex-col">
      <div className="max-w-7xl mx-auto w-full space-y-6 flex-1 flex flex-col">
        <AppHeader />

        {statusMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl px-4 py-3 flex justify-between items-center">
            <span>{statusMessage}</span>
            <button type="button" onClick={() => setStatusMessage('')} className="text-emerald-700 hover:text-emerald-900">
              <X size={16} />
            </button>
          </div>
        )}

        {!permissions.canViewAllStaff && !linkedStaff && !loading && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl px-4 py-3">
            Your login is not linked to a staff record yet. Use the same full name as your staff directory entry, or ask HR to set your `email` / `user_id` on the staff document.
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
              {permissions.canViewAllStaff ? 'Staff leave overview' : 'My leave'}
            </h2>
            <p className="text-slate-500 mt-1">
              {permissions.canViewAllStaff
                ? 'Manage staff leave schedules and balances'
                : 'View and submit your own leave requests'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {permissions.canImport && (
              <button
                type="button"
                onClick={handleImportClick}
                className="flex items-center space-x-2 bg-white hover:bg-slate-100 text-slate-700 px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm border border-slate-300"
              >
                <Upload size={18} />
                <span>Import</span>
              </button>
            )}
            {canCreateLeave && (
              <button
                type="button"
                onClick={openLeaveModal}
                className="flex items-center space-x-2 bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
              >
                <Plus size={18} />
                <span>New Leave Request</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
          <div className="bg-slate-50 p-6 rounded-xl shadow-sm border border-slate-200/60 flex items-center space-x-4">
            <div className="p-3 bg-emerald-100/50 text-emerald-700 rounded-lg">
              <Users size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{permissions.canViewAllStaff ? 'Total Staff' : 'My Profile'}</p>
              <h3 className="text-2xl font-bold text-slate-800">{loading ? '...' : visibleStaff.length}</h3>
            </div>
          </div>
          <div className="bg-slate-50 p-6 rounded-xl shadow-sm border border-slate-200/60 flex items-center space-x-4">
            <div className="p-3 bg-slate-200/50 text-slate-700 rounded-lg">
              <CalendarDays size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{permissions.canViewAllStaff ? 'Active on Leave' : 'Approved Leave'}</p>
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

        <div className="bg-slate-50 rounded-xl shadow-sm border border-slate-200/60 flex flex-col flex-1 overflow-hidden min-h-[400px]">
          <div className="p-5 border-b border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 shrink-0">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder={permissions.canViewAllStaff ? 'Search by name or designation...' : 'Search your record...'}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-100/50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition-all text-sm text-slate-700"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
            {permissions.canViewAllStaff && (
              <button
                type="button"
                className="flex items-center space-x-2 text-slate-600 hover:text-slate-800 px-4 py-2.5 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors text-sm font-medium"
              >
                <Filter size={16} />
                <span>Filter</span>
              </button>
            )}
          </div>

          {permissions.canViewAllStaff ? (
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
                          <button type="button" className="text-slate-400 hover:text-emerald-700 transition-colors p-1 rounded-md hover:bg-emerald-50">
                            <MoreHorizontal size={20} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-y-auto flex-1 p-5 space-y-4 custom-scrollbar">
              {loading ? (
                <div className="flex justify-center items-center space-x-2 py-12 text-slate-500">
                  <div className="w-5 h-5 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin"></div>
                  <span>Loading your leave records...</span>
                </div>
              ) : visibleLeaveRequests.length === 0 ? (
                <p className="text-sm text-slate-500 italic bg-slate-100/50 p-6 rounded-lg border border-slate-200/50 text-center">
                  No leave requests found for your staff record.
                </p>
              ) : (
                visibleLeaveRequests.map((request) => (
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
          )}
        </div>
      </div>

      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsLeaveModalOpen(false)}></div>

          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">Log New Leave Request</h2>
              <button type="button" onClick={() => setIsLeaveModalOpen(false)} className="text-slate-400 hover:text-slate-700 hover:bg-slate-200 p-1.5 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleLeaveSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Select Staff Member</label>
                <select
                  required
                  disabled={!permissions.canViewAllStaff}
                  value={formData.staffId}
                  onChange={(event) => setFormData({ ...formData, staffId: event.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition-all text-sm text-slate-700 disabled:bg-slate-100 disabled:text-slate-500"
                >
                  <option value="" disabled>-- Select Staff --</option>
                  {(permissions.canViewAllStaff ? staffList : visibleStaff).map((staff) => (
                    <option key={staff.$id} value={staff.$id}>{staff.staff_name} ({staff.designation})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Leave Type</label>
                <select
                  required
                  value={formData.leaveType}
                  onChange={(event) => setFormData({ ...formData, leaveType: event.target.value })}
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
                    onChange={(event) => setFormData({ ...formData, startDate: event.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition-all text-sm text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">End Date</label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(event) => setFormData({ ...formData, endDate: event.target.value })}
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
                type="button"
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
                  {leaveRequests.filter((req) => req.staff_id === selectedStaff.$id).length === 0 ? (
                    <p className="text-sm text-slate-500 italic bg-slate-100/50 p-4 rounded-lg border border-slate-200/50 text-center">
                      No leave requests found for this staff member.
                    </p>
                  ) : (
                    leaveRequests
                      .filter((req) => req.staff_id === selectedStaff.$id)
                      .map((request) => (
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
                          {permissions.canApprove && request.status === 'Pending Approval' && (
                            <div className="flex gap-2 pt-2">
                              <button
                                type="button"
                                onClick={() => updateLeaveStatus(request.$id, 'Approved')}
                                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-2 rounded-lg"
                              >
                                <CheckCircle size={14} />
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => updateLeaveStatus(request.$id, 'Rejected')}
                                className="flex-1 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-2 rounded-lg border border-rose-200"
                              >
                                Reject
                              </button>
                            </div>
                          )}
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
