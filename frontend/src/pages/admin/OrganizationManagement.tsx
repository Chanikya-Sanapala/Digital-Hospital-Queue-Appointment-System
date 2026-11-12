import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Organization } from '../../types';
import { Building2, Plus, Edit2, CheckCircle, XCircle } from 'lucide-react';

export const OrganizationManagement: React.FC = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrgs = async () => {
    try {
      const res = await api.get('/organizations?active_only=false');
      setOrganizations(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgs();
  }, []);

  const openCreateModal = () => {
    setEditingOrg(null);
    setName('');
    setCode('');
    setAddress('');
    setCity('');
    setPhone('');
    setEmail('');
    setIsActive(true);
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (org: Organization) => {
    setEditingOrg(org);
    setName(org.name);
    setCode(org.code);
    setAddress(org.address);
    setCity(org.city);
    setPhone(org.contact_phone);
    setEmail(org.contact_email);
    setIsActive(org.is_active);
    setError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editingOrg) {
        await api.patch(`/organizations/${editingOrg.id}`, {
          name,
          code,
          address,
          city,
          contact_phone: phone,
          contact_email: email,
          is_active: isActive,
        });
      } else {
        await api.post('/organizations', {
          name,
          code,
          address,
          city,
          contact_phone: phone,
          contact_email: email,
          is_active: isActive,
        });
      }
      setShowModal(false);
      fetchOrgs();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save organization.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#242424] tracking-tight">
            Healthcare Organizations
          </h1>
          <p className="text-xs text-[#777777] mt-0.5">
            Manage hospital centers, clinics, and multi-branch network settings.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-[#88C65A] hover:bg-[#77B34C] text-white text-xs font-semibold rounded-md shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
        >
          <Plus size={14} />
          <span>Add Facility</span>
        </button>
      </div>

      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-gray-500">Loading organizations...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E5E7EB] text-left text-xs">
              <thead className="bg-[#F4F5F7] text-[#777777] font-medium">
                <tr>
                  <th className="px-5 py-3">Facility Name</th>
                  <th className="px-5 py-3">Code</th>
                  <th className="px-5 py-3">Location</th>
                  <th className="px-5 py-3">Contact</th>
                  <th className="px-5 py-3">Departments</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] text-[#242424]">
                {organizations.map((org) => (
                  <tr key={org.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3.5 font-bold text-sm text-[#242424]">{org.name}</td>
                    <td className="px-5 py-3.5 font-mono text-gray-600 font-semibold">{org.code}</td>
                    <td className="px-5 py-3.5">
                      <div>{org.address}</div>
                      <div className="text-[11px] text-gray-500">{org.city}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div>{org.contact_phone}</div>
                      <div className="text-[11px] text-gray-500">{org.contact_email}</div>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-[#234F3E]">
                      {org.department_count || 0} active
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                          org.is_active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        {org.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => openEditModal(org)}
                        className="text-[#234F3E] hover:underline font-semibold"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl space-y-4">
            <h2 className="text-base font-bold text-[#242424]">
              {editingOrg ? 'Edit Facility Details' : 'Add New Facility'}
            </h2>

            {error && (
              <div className="p-2.5 rounded bg-red-50 text-xs text-red-700 border border-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-700 font-medium mb-1">Facility Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-md focus:outline-none focus:border-[#234F3E]"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Short Code (e.g. AMH)</label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-md uppercase font-mono focus:outline-none focus:border-[#234F3E]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-700 font-medium mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E5E7EB] rounded-md focus:outline-none focus:border-[#234F3E]"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Contact Phone</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E5E7EB] rounded-md focus:outline-none focus:border-[#234F3E]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Address</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-md focus:outline-none focus:border-[#234F3E]"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Contact Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-md focus:outline-none focus:border-[#234F3E]"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="activeToggle"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded text-[#88C65A]"
                />
                <label htmlFor="activeToggle" className="text-gray-700">Facility is active and taking appointments</label>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-2 border border-[#E5E7EB] rounded text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-[#88C65A] hover:bg-[#77B34C] text-white font-semibold rounded disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Save Facility'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

