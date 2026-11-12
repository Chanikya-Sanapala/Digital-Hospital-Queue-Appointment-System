import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Department, Service, Organization } from '../../types';
import { Stethoscope, Plus, Edit2, ChevronDown, ChevronRight } from 'lucide-react';

export const DepartmentManagement: React.FC = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  // Department Modal
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptPrefix, setDeptPrefix] = useState('');
  const [deptRoom, setDeptRoom] = useState('');
  const [deptCapacity, setDeptCapacity] = useState(100);
  const [deptDesc, setDeptDesc] = useState('');

  // Service Modal
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [targetDeptId, setTargetDeptId] = useState<string>('');
  const [serviceName, setServiceName] = useState('');
  const [serviceDuration, setServiceDuration] = useState(15);
  const [servicePrice, setServicePrice] = useState(40);
  const [serviceDesc, setServiceDesc] = useState('');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const res = await api.get('/organizations');
        setOrganizations(res.data);
        if (res.data.length > 0) {
          setSelectedOrgId(res.data[0].id);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchOrgs();
  }, []);

  const fetchData = async () => {
    if (!selectedOrgId) return;
    setLoading(true);
    try {
      const [deptRes, servRes] = await Promise.all([
        api.get(`/departments?organization_id=${selectedOrgId}`),
        api.get(`/services?organization_id=${selectedOrgId}`),
      ]);
      setDepartments(deptRes.data);
      setServices(servRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedOrgId]);

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/departments', {
        organization_id: selectedOrgId,
        name: deptName,
        code: deptCode,
        queue_prefix: deptPrefix,
        room_number: deptRoom,
        max_daily_capacity: Number(deptCapacity),
        description: deptDesc,
        is_active: true,
      });
      setShowDeptModal(false);
      setDeptName('');
      setDeptCode('');
      setDeptPrefix('');
      setDeptRoom('');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create department');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/services', {
        organization_id: selectedOrgId,
        department_id: targetDeptId,
        name: serviceName,
        duration_minutes: Number(serviceDuration),
        price: Number(servicePrice),
        description: serviceDesc,
        is_active: true,
      });
      setShowServiceModal(false);
      setServiceName('');
      setServiceDesc('');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create service');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#242424] tracking-tight">
            Departments &amp; Clinical Services
          </h1>
          <p className="text-xs text-[#777777] mt-0.5">
            Configure clinical units, queue prefixes, consultation durations, and tariffs.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={selectedOrgId}
            onChange={(e) => setSelectedOrgId(e.target.value)}
            className="px-3 py-2 border border-[#E5E7EB] rounded-md text-xs font-medium text-gray-700 bg-white"
          >
            {organizations.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>

          <button
            onClick={() => setShowDeptModal(true)}
            className="px-4 py-2 bg-[#88C65A] hover:bg-[#77B34C] text-white text-xs font-semibold rounded-md shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Department</span>
          </button>
        </div>
      </div>

      {/* Departments Accordion / List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white p-8 text-center text-xs text-gray-500 rounded-lg border border-[#E5E7EB]">
            Loading departments...
          </div>
        ) : departments.length === 0 ? (
          <div className="bg-white p-10 text-center text-xs text-gray-500 rounded-lg border border-[#E5E7EB]">
            No departments configured yet for this facility.
          </div>
        ) : (
          departments.map((dept) => {
            const deptServices = services.filter((s) => s.department_id === dept.id);
            return (
              <div key={dept.id} className="bg-white rounded-lg border border-[#E5E7EB] shadow-xs overflow-hidden">
                <div className="p-4 bg-gray-50/60 border-b border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-3">
                    <span className="w-8 h-8 rounded bg-[#234F3E] text-white flex items-center justify-center font-bold text-xs">
                      {dept.queue_prefix}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-[#242424]">{dept.name}</h3>
                      <p className="text-[11px] text-[#777777]">
                        Code: <span className="font-mono">{dept.code}</span> • Prefix: <span className="font-mono">{dept.queue_prefix}</span> • {dept.room_number || 'Main Area'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] bg-white border border-[#E5E7EB] px-2 py-0.5 rounded text-gray-600">
                      Cap: {dept.max_daily_capacity} / day
                    </span>
                    <button
                      onClick={() => {
                        setTargetDeptId(dept.id);
                        setShowServiceModal(true);
                      }}
                      className="px-2.5 py-1 bg-white border border-[#E5E7EB] hover:bg-gray-100 rounded text-xs text-[#234F3E] font-medium transition cursor-pointer flex items-center space-x-1"
                    >
                      <Plus size={12} />
                      <span>Add Service</span>
                    </button>
                  </div>
                </div>

                {/* Services Table */}
                <div className="p-4">
                  {deptServices.length === 0 ? (
                    <div className="text-center py-4 text-xs text-gray-400">
                      No services added to this department yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-[#E5E7EB] text-left text-xs">
                        <thead className="text-[#777777] font-medium">
                          <tr>
                            <th className="pb-2">Clinical Service</th>
                            <th className="pb-2">Description</th>
                            <th className="pb-2">Duration</th>
                            <th className="pb-2">Price</th>
                            <th className="pb-2">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-[#242424]">
                          {deptServices.map((srv) => (
                            <tr key={srv.id} className="hover:bg-gray-50/50">
                              <td className="py-2.5 font-medium">{srv.name}</td>
                              <td className="py-2.5 text-gray-500 max-w-xs truncate">{srv.description || '—'}</td>
                              <td className="py-2.5 text-gray-700">{srv.duration_minutes} mins</td>
                              <td className="py-2.5 font-semibold text-[#234F3E]">${srv.price}</td>
                              <td className="py-2.5">
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Active
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Department Modal */}
      {showDeptModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl space-y-4 text-xs">
            <h2 className="text-base font-bold text-[#242424]">Add Department</h2>
            <form onSubmit={handleCreateDept} className="space-y-3">
              <div>
                <label className="block text-gray-700 font-medium mb-1">Department Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ophthalmology"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded focus:outline-none focus:border-[#234F3E]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Code</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="e.g. OPHTH"
                    value={deptCode}
                    onChange={(e) => setDeptCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-[#E5E7EB] rounded font-mono uppercase focus:outline-none focus:border-[#234F3E]"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Queue Prefix</label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    placeholder="e.g. OP"
                    value={deptPrefix}
                    onChange={(e) => setDeptPrefix(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-[#E5E7EB] rounded font-mono uppercase focus:outline-none focus:border-[#234F3E]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Room / Floor</label>
                  <input
                    type="text"
                    placeholder="Room 102 - Floor 1"
                    value={deptRoom}
                    onChange={(e) => setDeptRoom(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E5E7EB] rounded focus:outline-none focus:border-[#234F3E]"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Daily Capacity</label>
                  <input
                    type="number"
                    min={1}
                    value={deptCapacity}
                    onChange={(e) => setDeptCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-[#E5E7EB] rounded focus:outline-none focus:border-[#234F3E]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Description</label>
                <textarea
                  rows={2}
                  value={deptDesc}
                  onChange={(e) => setDeptDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded focus:outline-none focus:border-[#234F3E]"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowDeptModal(false)}
                  className="px-3 py-1.5 border border-[#E5E7EB] rounded text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 bg-[#88C65A] hover:bg-[#77B34C] text-white font-semibold rounded"
                >
                  Save Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Service Modal */}
      {showServiceModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl space-y-4 text-xs">
            <h2 className="text-base font-bold text-[#242424]">Add Clinical Service</h2>
            <form onSubmit={handleCreateService} className="space-y-3">
              <div>
                <label className="block text-gray-700 font-medium mb-1">Service Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Comprehensive Vision Exam"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded focus:outline-none focus:border-[#234F3E]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Duration (minutes)</label>
                  <input
                    type="number"
                    min={5}
                    max={180}
                    step={5}
                    value={serviceDuration}
                    onChange={(e) => setServiceDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-[#E5E7EB] rounded focus:outline-none focus:border-[#234F3E]"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Tariff / Fee ($)</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={servicePrice}
                    onChange={(e) => setServicePrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-[#E5E7EB] rounded focus:outline-none focus:border-[#234F3E]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Description</label>
                <textarea
                  rows={2}
                  value={serviceDesc}
                  onChange={(e) => setServiceDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded focus:outline-none focus:border-[#234F3E]"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowServiceModal(false)}
                  className="px-3 py-1.5 border border-[#E5E7EB] rounded text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 bg-[#88C65A] hover:bg-[#77B34C] text-white font-semibold rounded"
                >
                  Save Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

