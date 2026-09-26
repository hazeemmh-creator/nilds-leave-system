export function findLinkedStaff(staffList, user) {
  if (!user || !Array.isArray(staffList) || staffList.length === 0) {
    return null;
  }

  const email = String(user.email || '').trim().toLowerCase();
  const name = String(user.name || '').trim().toLowerCase();

  return (
    staffList.find((staff) => {
      if (staff.user_id && staff.user_id === user.$id) {
        return true;
      }

      if (email && staff.email && String(staff.email).trim().toLowerCase() === email) {
        return true;
      }

      if (name && String(staff.staff_name || '').trim().toLowerCase() === name) {
        return true;
      }

      return false;
    }) || null
  );
}
