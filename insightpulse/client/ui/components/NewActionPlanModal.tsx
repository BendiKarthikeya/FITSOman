import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, getQueryFn } from '@/lib/queryClient';

interface NewActionPlanModalProps {
  open: boolean;
  onClose: () => void;
}

interface Employee {
  id: string;
  firstName?: string;
  lastName?: string;
  username: string;
  email: string;
  role?: string;
}

export const NewActionPlanModal: React.FC<NewActionPlanModalProps> = ({ open, onClose }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [status, setStatus] = useState<'todo' | 'in_progress' | 'completed' | 'review'>('todo');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Fetch users for assignment
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['/api/users'],
    queryFn: getQueryFn({ on401: 'returnNull' }) as any,
    enabled: open,
  });

  // Create action plan mutation
  const createActionPlanMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      assignedTo?: string | null;
      priority: string;
      status: string;
      dueDate?: string;
    }) => {
      const response = await apiRequest('POST', '/api/action-plans', {
        name: data.name,
        description: data.description,
        assignedTo: data.assignedTo,
        priority: data.priority,
        status: data.status,
        dueDate: data.dueDate,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/action-plans'] });
      resetForm();
      onClose();
    },
    onError: (error) => {
      console.error('Error creating action plan:', error);
      setError('Failed to create action plan. Please try again.');
    },
  });

  const resetForm = () => {
    setName('');
    setDescription('');
    setAssignedTo(null);
    setPriority('medium');
    setStatus('todo');
    setDueDate('');
    setError(null);
  };

  // Focus name input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => nameRef.current?.focus(), 50);
      resetForm();
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Task name is required');
      return;
    }

    setIsSubmitting(true);
    createActionPlanMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      assignedTo,
      priority,
      status,
      dueDate: dueDate || undefined,
    });
    setIsSubmitting(false);
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return '?';
    if (!firstName) return lastName![0].toUpperCase();
    if (!lastName) return firstName[0].toUpperCase();
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500',
      'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500'
    ];
    const hashCode = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hashCode % colors.length];
  };

  const selectedEmployee = assignedTo ? employees.find(e => e.id === assignedTo) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Modal card */}
      <div className="relative bg-white rounded-[14px] shadow-[0px_8px_30px_0px_rgba(0,0,0,0.15)] w-[500px] p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        {/* Header row */}
        <div className="flex items-start justify-between gap-0.5">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-[15px] font-semibold font-['Inter',sans-serif] leading-[22.5px] tracking-[-0.23px] text-[#0a0a0a] whitespace-nowrap">
              Create New Task
            </h3>
            <p className="text-[13px] font-normal font-['Inter',sans-serif] leading-[19.5px] tracking-[-0.08px] text-[#717182]">
              Add a new task to your action plan board.
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center h-6 w-6 rounded-md text-[#717182] hover:text-[#0a0a0a] hover:bg-slate-100 transition-colors shrink-0 mt-0.5"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Task Name */}
          <div className="flex flex-col gap-2">
            <label className="text-[14px] font-medium font-['IBM_Plex_Sans',sans-serif] leading-5 text-[#0a0a0a]">
              Task Name <span className="text-red-500">*</span>
            </label>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="eg. Improve customer onboarding"
              className="w-full h-9 px-3 py-1 rounded-lg border border-[#e5e5e5] bg-white text-[16px] font-normal font-['Inter',sans-serif] leading-6 text-[#0a0a0a] placeholder:text-[#737373] outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 transition-colors"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-2">
            <label className="text-[14px] font-medium font-['IBM_Plex_Sans',sans-serif] leading-5 text-[#0a0a0a]">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter task details and requirements"
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-[#e5e5e5] bg-white text-[14px] font-normal font-['Inter',sans-serif] leading-5 text-[#0a0a0a] placeholder:text-[#737373] outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 transition-colors resize-none"
            />
          </div>

          {/* Assign To */}
          <div className="flex flex-col gap-2">
            <label className="text-[14px] font-medium font-['IBM_Plex_Sans',sans-serif] leading-5 text-[#0a0a0a]">
              Assign To
            </label>
            <div className="relative">
              <select
                value={assignedTo || ''}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAssignedTo(e.target.value || null)}
                className="w-full h-9 px-3 py-1 rounded-lg border border-[#e5e5e5] bg-white text-[14px] font-normal text-[#0a0a0a] outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 transition-colors appearance-none"
              >
                <option value="">Unassigned</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.firstName ? `${employee.firstName} ${employee.lastName || ''}` : employee.username}
                  </option>
                ))}
              </select>
            </div>
            {selectedEmployee && (
              <div className="flex items-center gap-2 p-2 bg-[#f5f5f5] rounded-lg">
                <div className={`h-6 w-6 rounded-full ${getAvatarColor(selectedEmployee.username)} flex items-center justify-center text-white font-semibold text-xs`}>
                  {getInitials(selectedEmployee.firstName, selectedEmployee.lastName)}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[#0a0a0a]">{selectedEmployee.firstName ? `${selectedEmployee.firstName} ${selectedEmployee.lastName || ''}`.trim() : selectedEmployee.username}</span>
                </div>
              </div>
            )}
          </div>

          {/* Priority */}
          <div className="flex flex-col gap-2">
            <label className="text-[14px] font-medium font-['IBM_Plex_Sans',sans-serif] leading-5 text-[#0a0a0a]">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high' | 'critical')}
              className="w-full h-9 px-3 py-1 rounded-lg border border-[#e5e5e5] bg-white text-[14px] font-normal text-[#0a0a0a] outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 transition-colors"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {/* Status */}
          <div className="flex flex-col gap-2">
            <label className="text-[14px] font-medium font-['IBM_Plex_Sans',sans-serif] leading-5 text-[#0a0a0a]">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'todo' | 'in_progress' | 'completed' | 'review')}
              className="w-full h-9 px-3 py-1 rounded-lg border border-[#e5e5e5] bg-white text-[14px] font-normal text-[#0a0a0a] outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 transition-colors"
            >
              <option value="todo">To-Do</option>
              <option value="in_progress">In Progress</option>
              <option value="review">Review</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Due Date */}
          <div className="flex flex-col gap-2">
            <label className="text-[14px] font-medium font-['IBM_Plex_Sans',sans-serif] leading-5 text-[#0a0a0a]">
              Due Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#737373] pointer-events-none" />
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full h-9 pl-9 pr-3 py-1 rounded-lg border border-[#e5e5e5] bg-white text-[14px] font-normal text-[#0a0a0a] outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 transition-colors"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[14px] font-medium text-[#0a0a0a] hover:bg-[#f5f5f5] rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || createActionPlanMutation.isPending}
              className="px-4 py-2 text-[14px] font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting || createActionPlanMutation.isPending ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
