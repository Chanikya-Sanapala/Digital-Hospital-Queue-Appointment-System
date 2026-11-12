import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Organization, Department, Service, AvailabilityResponse } from '../../types';
import { Building2, Stethoscope, Calendar, Clock, CheckCircle2, ArrowLeft, ArrowRight } from 'lucide-react';

export const BookAppointment: React.FC = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState<number>(1);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);

  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  // Default to today or tomorrow
  const todayStr = new Date().toISOString().split('T')[0];
  const [appointmentDate, setAppointmentDate] = useState<string>(todayStr);
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch Organizations on mount
  useEffect(() => {
    const fetchOrgs = async () => {
      setLoading(true);
      try {
        const res = await api.get('/organizations');
        setOrganizations(res.data);
        if (res.data.length > 0) {
          setSelectedOrg(res.data[0]);
        }
      } catch (err: any) {
        setError('Failed to load healthcare organizations.');
      } finally {
        setLoading(false);
      }
    };
    fetchOrgs();
  }, []);

  // Fetch departments when organization is selected
  useEffect(() => {
    if (selectedOrg) {
      const fetchDepts = async () => {
        try {
          const res = await api.get(`/organizations/${selectedOrg.id}/departments`);
          setDepartments(res.data);
          if (res.data.length > 0) {
            setSelectedDept(res.data[0]);
          }
        } catch (e) {
          console.error(e);
        }
      };
      fetchDepts();
    }
  }, [selectedOrg]);

  // Fetch services when department is selected
  useEffect(() => {
    if (selectedDept) {
      const fetchServices = async () => {
        try {
          const res = await api.get(`/services?department_id=${selectedDept.id}`);
          setServices(res.data);
          if (res.data.length > 0) {
            setSelectedService(res.data[0]);
          }
        } catch (e) {
          console.error(e);
        }
      };
      fetchServices();
    }
  }, [selectedDept]);

  // Fetch slot availability when service and date are selected
  useEffect(() => {
    if (selectedService && appointmentDate && step >= 3) {
      const fetchSlots = async () => {
        setLoading(true);
        try {
          const res = await api.get(`/services/${selectedService.id}/availability?date=${appointmentDate}`);
          setAvailability(res.data);
          // Auto select first available slot
          const firstAvail = res.data.slots.find((s: any) => s.available);
          if (firstAvail) setSelectedSlot(firstAvail.time_slot);
        } catch (e) {
          console.error('Failed to load slots', e);
        } finally {
          setLoading(false);
        }
      };
      fetchSlots();
    }
  }, [selectedService, appointmentDate, step]);

  const handleConfirmBooking = async () => {
    if (!selectedOrg || !selectedDept || !selectedService || !selectedSlot) {
      setError('Please ensure all booking selections are completed.');
      return;
    }

    setBookingLoading(true);
    setError(null);
    try {
      const res = await api.post('/appointments', {
        organization_id: selectedOrg.id,
        department_id: selectedDept.id,
        service_id: selectedService.id,
        appointment_date: appointmentDate,
        time_slot: selectedSlot,
        notes: notes.trim(),
      });

      // Redirect to Digital Ticket page
      navigate(`/customer/ticket?id=${res.data.token_id || res.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Booking failed. Slot may already be full.');
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-[#242424] tracking-tight">
          Book an Appointment
        </h1>
        <p className="text-xs text-[#777777] mt-0.5">
          Step-by-step digital queue token &amp; clinic appointment scheduling.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* 4 Step Indicator */}
      <div className="grid grid-cols-4 gap-2 text-xs">
        {[
          { num: 1, label: 'Organization' },
          { num: 2, label: 'Department' },
          { num: 3, label: 'Date & Slot' },
          { num: 4, label: 'Confirmation' },
        ].map((item) => (
          <div
            key={item.num}
            onClick={() => {
              if (item.num < step) setStep(item.num);
            }}
            className={`p-3 rounded-md border text-center transition ${
              step === item.num
                ? 'bg-white border-[#234F3E] text-[#234F3E] font-bold shadow-xs'
                : step > item.num
                ? 'bg-gray-50 border-[#E5E7EB] text-gray-500 cursor-pointer'
                : 'bg-transparent border-[#E5E7EB] text-gray-400'
            }`}
          >
            <div className="text-[11px] uppercase tracking-wider">Step {item.num}</div>
            <div className="font-medium truncate">{item.label}</div>
          </div>
        ))}
      </div>

      {/* STEP 1: Select Organization */}
      {step === 1 && (
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-6 shadow-xs space-y-4">
          <div className="border-b border-[#E5E7EB] pb-3">
            <h2 className="text-sm font-bold text-[#242424]">Select Healthcare Facility</h2>
            <p className="text-xs text-[#777777]">Choose the hospital or branch you plan to visit.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {organizations.map((org) => {
              const isSelected = selectedOrg?.id === org.id;
              return (
                <div
                  key={org.id}
                  onClick={() => setSelectedOrg(org)}
                  className={`p-4 rounded-md border cursor-pointer transition ${
                    isSelected
                      ? 'border-[#234F3E] bg-emerald-50/30 ring-1 ring-[#234F3E]'
                      : 'border-[#E5E7EB] hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-[#242424]">{org.name}</h3>
                      <p className="text-xs text-gray-500 mt-1">{org.address}, {org.city}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-100 font-mono text-gray-700">
                      {org.code}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#777777] mt-3 pt-2 border-t border-gray-100 flex justify-between">
                    <span>{org.contact_phone}</span>
                    <span className="font-medium text-[#234F3E]">{org.department_count || 5} Departments</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 flex justify-end">
            <button
              onClick={() => {
                if (selectedOrg) setStep(2);
              }}
              className="px-5 py-2.5 bg-[#88C65A] hover:bg-[#77B34C] text-white text-xs font-semibold rounded-md shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
            >
              <span>Next: Select Department</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Select Department & Service */}
      {step === 2 && (
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-6 shadow-xs space-y-6">
          <div className="border-b border-[#E5E7EB] pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#242424]">Select Department &amp; Clinical Service</h2>
              <p className="text-xs text-[#777777]">Choose specialty clinic and service requirement.</p>
            </div>
            <span className="text-xs font-semibold text-[#234F3E] bg-gray-100 px-2 py-1 rounded">
              {selectedOrg?.name}
            </span>
          </div>

          {/* Department Selection */}
          <div>
            <label className="block text-xs font-semibold text-[#242424] mb-2">
              1. Choose Department
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {departments.map((dept) => {
                const isSelected = selectedDept?.id === dept.id;
                return (
                  <div
                    key={dept.id}
                    onClick={() => setSelectedDept(dept)}
                    className={`p-3 rounded-md border cursor-pointer transition ${
                      isSelected
                        ? 'border-[#234F3E] bg-emerald-50/40 ring-1 ring-[#234F3E]'
                        : 'border-[#E5E7EB] hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#242424]">{dept.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                        {dept.queue_prefix}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1 line-clamp-1">
                      {dept.room_number || dept.description}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Service Selection */}
          <div>
            <label className="block text-xs font-semibold text-[#242424] mb-2">
              2. Choose Service
            </label>
            <div className="space-y-2">
              {services.map((srv) => {
                const isSelected = selectedService?.id === srv.id;
                return (
                  <div
                    key={srv.id}
                    onClick={() => setSelectedService(srv)}
                    className={`p-3.5 rounded-md border cursor-pointer flex items-center justify-between transition ${
                      isSelected
                        ? 'border-[#234F3E] bg-emerald-50/40 ring-1 ring-[#234F3E]'
                        : 'border-[#E5E7EB] hover:border-gray-300'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-[#242424]">{srv.name}</div>
                      <div className="text-[11px] text-gray-500 mt-0.5">{srv.description}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-[#234F3E]">${srv.price}</div>
                      <div className="text-[11px] text-gray-400">{srv.duration_minutes} mins</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 flex justify-between border-t border-[#E5E7EB]">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 border border-[#E5E7EB] text-[#242424] text-xs font-medium rounded-md hover:bg-gray-50 transition flex items-center space-x-1"
            >
              <ArrowLeft size={13} />
              <span>Back</span>
            </button>
            <button
              onClick={() => {
                if (selectedDept && selectedService) setStep(3);
              }}
              className="px-5 py-2.5 bg-[#88C65A] hover:bg-[#77B34C] text-white text-xs font-semibold rounded-md shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
            >
              <span>Next: Choose Date &amp; Slot</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Choose Date & Time Slot */}
      {step === 3 && (
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-6 shadow-xs space-y-6">
          <div className="border-b border-[#E5E7EB] pb-3">
            <h2 className="text-sm font-bold text-[#242424]">Select Date &amp; Available Time Slot</h2>
            <p className="text-xs text-[#777777]">
              {selectedDept?.name} • {selectedService?.name} ({selectedService?.duration_minutes} mins)
            </p>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-semibold text-[#242424] mb-1.5">
              Appointment Date
            </label>
            <input
              type="date"
              min={todayStr}
              value={appointmentDate}
              onChange={(e) => setAppointmentDate(e.target.value)}
              className="w-full sm:w-64 px-3 py-2 border border-[#E5E7EB] rounded-md text-xs focus:outline-none focus:border-[#234F3E]"
            />
          </div>

          {/* Time Slots */}
          <div>
            <label className="block text-xs font-semibold text-[#242424] mb-2">
              Available Slots for {appointmentDate}
            </label>

            {loading ? (
              <div className="py-8 text-center text-xs text-gray-500">Checking slot availability...</div>
            ) : !availability || availability.slots.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-500">No slots available for this date.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {availability.slots.map((slot) => {
                  const isSelected = selectedSlot === slot.time_slot;
                  return (
                    <button
                      key={slot.time_slot}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => setSelectedSlot(slot.time_slot)}
                      className={`p-2.5 rounded-md border text-center transition cursor-pointer disabled:cursor-not-allowed ${
                        !slot.available
                          ? 'bg-gray-100 border-gray-200 text-gray-400 opacity-60'
                          : isSelected
                          ? 'border-[#234F3E] bg-[#234F3E] text-white font-bold'
                          : 'border-[#E5E7EB] hover:border-gray-400 text-[#242424] bg-white'
                      }`}
                    >
                      <div className="text-xs font-medium">{slot.time_slot}</div>
                      <div className="text-[10px] mt-0.5 opacity-80">
                        {slot.available ? `${slot.capacity - slot.booked_count} left` : 'Full'}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-4 flex justify-between border-t border-[#E5E7EB]">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 border border-[#E5E7EB] text-[#242424] text-xs font-medium rounded-md hover:bg-gray-50 transition flex items-center space-x-1"
            >
              <ArrowLeft size={13} />
              <span>Back</span>
            </button>
            <button
              disabled={!selectedSlot}
              onClick={() => setStep(4)}
              className="px-5 py-2.5 bg-[#88C65A] hover:bg-[#77B34C] text-white text-xs font-semibold rounded-md shadow-xs transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <span>Next: Review &amp; Confirm</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Review & Confirm */}
      {step === 4 && (
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-6 shadow-xs space-y-6">
          <div className="border-b border-[#E5E7EB] pb-3">
            <h2 className="text-sm font-bold text-[#242424]">Review &amp; Confirm Appointment</h2>
            <p className="text-xs text-[#777777]">A digital queue token will be generated upon confirmation.</p>
          </div>

          {/* Booking Summary Card */}
          <div className="bg-[#F4F5F7] rounded-md p-4 space-y-2.5 text-xs text-[#242424]">
            <div className="flex justify-between pb-2 border-b border-gray-200">
              <span className="text-gray-500">Hospital:</span>
              <span className="font-semibold">{selectedOrg?.name} ({selectedOrg?.city})</span>
            </div>
            <div className="flex justify-between pb-2 border-b border-gray-200">
              <span className="text-gray-500">Department:</span>
              <span className="font-semibold">{selectedDept?.name}</span>
            </div>
            <div className="flex justify-between pb-2 border-b border-gray-200">
              <span className="text-gray-500">Service:</span>
              <span className="font-semibold">{selectedService?.name}</span>
            </div>
            <div className="flex justify-between pb-2 border-b border-gray-200">
              <span className="text-gray-500">Scheduled Date:</span>
              <span className="font-semibold">{appointmentDate}</span>
            </div>
            <div className="flex justify-between pb-2 border-b border-gray-200">
              <span className="text-gray-500">Time Slot:</span>
              <span className="font-bold text-[#234F3E]">{selectedSlot}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Consultation Fee:</span>
              <span className="font-bold text-[#88C65A]">${selectedService?.price}</span>
            </div>
          </div>

          {/* Optional Patient Notes */}
          <div>
            <label className="block text-xs font-semibold text-[#242424] mb-1.5">
              Reason for Visit / Patient Symptoms (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Describe your primary reason for visiting or medical concerns..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-md text-xs focus:outline-none focus:border-[#234F3E]"
            />
          </div>

          <div className="pt-4 flex justify-between border-t border-[#E5E7EB]">
            <button
              onClick={() => setStep(3)}
              className="px-4 py-2 border border-[#E5E7EB] text-[#242424] text-xs font-medium rounded-md hover:bg-gray-50 transition flex items-center space-x-1"
            >
              <ArrowLeft size={13} />
              <span>Back</span>
            </button>
            <button
              onClick={handleConfirmBooking}
              disabled={bookingLoading}
              className="px-6 py-2.5 bg-[#88C65A] hover:bg-[#77B34C] text-white text-xs font-semibold rounded-md shadow-xs transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-60"
            >
              {bookingLoading ? 'Generating Token...' : 'Confirm & Generate Ticket'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

