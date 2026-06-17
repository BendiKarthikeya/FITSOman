import React, { useState, DragEvent, useMemo, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Home,
  FilePenLine,
  GitGraph,
  Users,
  Navigation,
  PieChart,
  Settings,
  PanelLeft,
  ChevronRight,
  MessagesSquare,
  Paperclip,
  Plus,
  X,
} from 'lucide-react';
import { Sidebar } from '../layout/Sidebar';
import { NewActionPlanModal } from '../components/NewActionPlanModal';
import { apiRequest, getQueryFn } from '@/lib/queryClient';

// ─── Sidebar items ────────────────────────────────────────────────────────────
const sidebarItems = [
  { label: 'Dashboard', icon: <Home className="h-4 w-4" />, href: '/dashboard' },
  { label: 'Surveys', icon: <FilePenLine className="h-4 w-4" />, href: '/surveys' },
  { label: 'Analytics', icon: <GitGraph className="h-4 w-4" />, href: '/analytics' },
  { label: 'Team Insights', icon: <Users className="h-4 w-4" />, href: '/teamInsights' },
  { label: 'Action Planning', icon: <Navigation className="h-4 w-4" />, href: '/actionPlanningBoard' },
  { label: 'Reports', icon: <PieChart className="h-4 w-4" />, href: '/reports' },
  { label: 'Settings', icon: <Settings className="h-4 w-4" />, href: '/settings' },
];

// ─── Card interface ───────────────────────────────────────────────────────────
interface ActionPlan {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  status: 'todo' | 'in_progress' | 'completed' | 'review';
  priority: 'low' | 'medium' | 'high' | 'critical';
  dueDate?: string;
  assignedTo?: string;
  assignedUser?: {
    id: string;
    username: string;
    email: string;
  };
  commentsCount: number;
  attachmentsCount: number;
  createdAt: string;
  comments?: any[];
  attachments?: any[];
}

// ─── Card detail modal ────────────────────────────────────────────────────────
interface CardDetailModalProps {
  card: ActionPlan;
  isOpen: boolean;
  onClose: () => void;
  onAssignedUserChange?: (cardId: string, userId: string | null) => void;
}

interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  username: string;
  email: string;
}

const CardDetailModal: React.FC<CardDetailModalProps> = ({ card, isOpen, onClose, onAssignedUserChange }) => {
  const [isEditingAssignee, setIsEditingAssignee] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(card.assignedTo || null);
  const [showExpandedComments, setShowExpandedComments] = useState(false);
  const [showExpandedAttachments, setShowExpandedAttachments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const queryClient = useQueryClient();

  // Fetch organization users for assignment - must be before early return to avoid hook violations
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['users-assignment'],
    queryFn: async () => {
      const token = localStorage.getItem('insightpulse_token');
      console.log('[useQuery] Fetching users with token:', token ? '✓ Present' : '✗ Missing');
      
      const response = await fetch('http://localhost:5001/api/users', {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      console.log('[useQuery] Response status:', response.status);
      
      if (!response.ok) {
        const text = await response.text();
        console.error('[useQuery] Error response:', text);
        throw new Error(`Failed to fetch users: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[useQuery] Got users:', data.length);
      return data;
    },
  });

  // Use comments from card data if available, otherwise fetch
  const [comments, setComments] = useState<any[]>(card.comments || []);
  const [commentsLoading, setCommentsLoading] = useState(false);
  
  const refetchComments = async () => {
    setCommentsLoading(true);
    try {
      const token = localStorage.getItem('insightpulse_token');
      const response = await fetch(`http://localhost:5001/api/action-plans/${card.id}/comments`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch comments');
      const data = await response.json();
      setComments(data);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setCommentsLoading(false);
    }
  };

  // Fetch comments when expanded if not already loaded
  useEffect(() => {
    if (showExpandedComments && comments.length === 0 && card.commentsCount > 0) {
      refetchComments();
    }
  }, [showExpandedComments]);

  // Use attachments from card data if available, otherwise fetch
  const [attachments, setAttachments] = useState<any[]>(card.attachments || []);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  
  const refetchAttachments = async () => {
    setAttachmentsLoading(true);
    try {
      const token = localStorage.getItem('insightpulse_token');
      const response = await fetch(`http://localhost:5001/api/action-plans/${card.id}/attachments`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch attachments');
      const data = await response.json();
      setAttachments(data);
    } catch (error) {
      console.error('Error fetching attachments:', error);
    } finally {
      setAttachmentsLoading(false);
    }
  };

  // Fetch attachments when expanded if not already loaded
  useEffect(() => {
    if (showExpandedAttachments && attachments.length === 0 && card.attachmentsCount > 0) {
      refetchAttachments();
    }
  }, [showExpandedAttachments]);

  // Mutation to create a new comment
  const createCommentMutation = useMutation({
    mutationFn: async (commentText: string) => {
      const token = localStorage.getItem('insightpulse_token');
      const response = await fetch(`http://localhost:5001/api/action-plans/${card.id}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comment: commentText }),
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to create comment');
      return response.json();
    },
    onSuccess: () => {
      refetchComments();
      queryClient.invalidateQueries({ queryKey: ['/api/action-plans'] });
      setNewComment('');
    },
  });

  // Mutation to update assigned user - must be before early return
  const updateAssignmentMutation = useMutation({
    mutationFn: async (userId: string | null) => {
      console.log('[CardDetailModal] Saving assignment:', { cardId: card.id, userId });
      const response = await apiRequest('PUT', `/api/action-plans/${card.id}`, {
        assignedTo: userId,
      });
      console.log('[CardDetailModal] Save response:', response);
      return response;
    },
    onSuccess: () => {
      console.log('[CardDetailModal] Save successful');
      queryClient.invalidateQueries({ queryKey: ['/api/action-plans'] });
      setIsEditingAssignee(false);
      onAssignedUserChange?.(card.id, selectedUserId);
      onClose();
    },
    onError: (error) => {
      console.error('[CardDetailModal] Save error:', error);
    },
  });

  // Fetch comments and attachments when modal opens
  useEffect(() => {
    if (isOpen && card.commentsCount > 0 && comments.length === 0) {
      console.log('[CardDetailModal] Fetching comments for card:', card.id);
      refetchComments();
    }
    if (isOpen && card.attachmentsCount > 0 && attachments.length === 0) {
      console.log('[CardDetailModal] Fetching attachments for card:', card.id);
      refetchAttachments();
    }
  }, [isOpen]);

  // Early return after all hooks are called
  if (!isOpen) return null;

  // Create initials from first and last name
  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return '?';
    if (!firstName) return lastName![0].toUpperCase();
    if (!lastName) return firstName[0].toUpperCase();
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  // Generate a color based on full name for avatar background
  const getAvatarColor = (name?: string) => {
    const colors = [
      'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500',
      'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500'
    ];
    if (!name) return colors[0];
    const hashCode = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hashCode % colors.length];
  };

  const handleSaveAssignment = () => {
    updateAssignmentMutation.mutate(selectedUserId);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#e5e5e5]">
          <h2 className="text-2xl font-bold text-[#0a0a0a]">{card.name}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-[#737373]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Description */}
          <div>
            <h3 className="text-sm font-semibold text-[#0a0a0a] mb-2">Description</h3>
            <p className="text-[14px] text-[#737373]">
              {card.description || 'No description provided'}
            </p>
          </div>

          {/* Assigned User */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#0a0a0a]">Assigned To</h3>
              <button
                onClick={() => setIsEditingAssignee(!isEditingAssignee)}
                className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
              >
                {isEditingAssignee ? 'Cancel' : 'Change'}
              </button>
            </div>

            {isEditingAssignee ? (
              <div className="space-y-3">
                <div className="max-h-[300px] overflow-y-auto border border-[#e5e5e5] rounded-lg p-3">
                  {usersLoading ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-[#737373]">Loading employees...</p>
                    </div>
                  ) : users.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-[#737373]">No employees found</p>
                    </div>
                  ) : (
                    <>
                      {/* Unassigned option */}
                      <button
                        onClick={() => setSelectedUserId(null)}
                        className={`w-full text-left px-3 py-2 rounded-lg mb-2 transition-colors ${
                          selectedUserId === null
                            ? 'bg-blue-100 text-blue-900'
                            : 'hover:bg-[#f5f5f5]'
                        }`}
                      >
                        <span className="text-sm font-medium">Unassigned</span>
                      </button>

                      {/* User options */}
                      {users.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => setSelectedUserId(user.id)}
                          className={`w-full text-left px-3 py-2 rounded-lg mb-2 flex items-center gap-2 transition-colors ${
                            selectedUserId === user.id
                              ? 'bg-blue-100'
                              : 'hover:bg-[#f5f5f5]'
                          }`}
                        >
                          <div className={`h-8 w-8 rounded-full ${getAvatarColor(user.username)} flex items-center justify-center text-white font-semibold text-xs flex-shrink-0`}>
                            {getInitials(user.firstName, user.lastName)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#0a0a0a] truncate">{user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.username}</p>
                            <p className="text-xs text-[#737373] truncate">{user.email}</p>
                          </div>
                          {selectedUserId === user.id && (
                            <span className="text-blue-600 font-bold flex-shrink-0">✓</span>
                          )}
                        </button>
                      ))}
                    </>
                  )}
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setIsEditingAssignee(false)}
                    className="px-3 py-2 text-sm font-medium text-[#737373] hover:bg-[#f5f5f5] rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveAssignment}
                    disabled={updateAssignmentMutation.isPending}
                    className="px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {updateAssignmentMutation.isPending ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {card.assignedUser ? (
                  <div className="flex items-center gap-3 p-3 bg-[#f5f5f5] rounded-lg">
                    <div className={`h-10 w-10 rounded-full ${getAvatarColor(card.assignedUser.email)} flex items-center justify-center text-white font-semibold text-sm`}>
                      {card.assignedUser.username.charAt(0).toUpperCase()}{card.assignedUser.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-[#0a0a0a]">{card.assignedUser.username}</p>
                      <p className="text-sm text-[#737373]">{card.assignedUser.email}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-[14px] text-[#737373] px-3 py-2">Not assigned</p>
                )}
              </>
            )}
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold text-[#0a0a0a] mb-2">Priority</h3>
              <span className={`inline-flex items-center justify-center h-[22px] rounded-[8px] px-[10px] font-['IBM_Plex_Sans'] text-[12px] font-normal ${getPriorityColorClass(card.priority)}`}>
                {card.priority.charAt(0).toUpperCase() + card.priority.slice(1)}
              </span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#0a0a0a] mb-2">Status</h3>
              <span className="inline-flex items-center justify-center h-[22px] rounded-[8px] px-[10px] bg-[#e8f5e9] text-[#2e7d32] font-['IBM_Plex_Sans'] text-[12px] font-normal">
                {card.status.replace('_', ' ').charAt(0).toUpperCase() + card.status.replace('_', ' ').slice(1)}
              </span>
            </div>
          </div>

          {/* Due Date */}
          {card.dueDate && (
            <div>
              <h3 className="text-sm font-semibold text-[#0a0a0a] mb-2">Due Date</h3>
              <p className="text-[14px] text-[#737373]">
                {new Date(card.dueDate).toLocaleDateString([], {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </p>
            </div>
          )}

          {/* Comments Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MessagesSquare className="h-4 w-4 text-[#0a0a0a]" />
              <h3 className="text-sm font-semibold text-[#0a0a0a]">Comments ({card.commentsCount})</h3>
            </div>
            {showExpandedComments ? (
              <div className="space-y-3">
                {commentsLoading ? (
                  <div className="text-center text-[#737373] py-4">Loading comments...</div>
                ) : comments.length > 0 ? (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {comments.map((comment) => (
                      <div key={comment.id} className="bg-white border border-[#e5e5e5] rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-600">
                            {comment.user?.firstName?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[#0a0a0a]">
                              {comment.user?.firstName ? `${comment.user.firstName} ${comment.user.lastName || ''}`.trim() : 'Unknown'}
                            </p>
                            <p className="text-xs text-[#737373]">
                              {new Date(comment.createdAt).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-[#0a0a0a]">{comment.comment}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-[#737373] py-4">No comments yet</div>
                )}
                
                {/* Add comment form */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newComment.trim()) {
                        createCommentMutation.mutate(newComment);
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-[#e5e5e5] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => createCommentMutation.mutate(newComment)}
                    disabled={createCommentMutation.isPending || !newComment.trim()}
                    className="px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>

                <button
                  onClick={() => setShowExpandedComments(false)}
                  className="text-sm text-[#0366d6] hover:underline"
                >
                  Collapse
                </button>
              </div>
            ) : card.commentsCount > 0 ? (
              <button
                onClick={() => setShowExpandedComments(true)}
                className="w-full bg-[#f5f5f5] hover:bg-[#ececec] rounded-lg p-4 text-center text-[#737373] text-sm transition-colors"
              >
                {card.commentsCount} comment{card.commentsCount !== 1 ? 's' : ''} - Click to expand
              </button>
            ) : (
              <div className="bg-[#f5f5f5] rounded-lg p-4 text-center text-[#737373] text-sm">
                No comments yet
              </div>
            )}
          </div>

          {/* Attachments Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Paperclip className="h-4 w-4 text-[#0a0a0a]" />
              <h3 className="text-sm font-semibold text-[#0a0a0a]">Attachments ({card.attachmentsCount})</h3>
            </div>
            {showExpandedAttachments ? (
              <div className="space-y-3">
                {attachmentsLoading ? (
                  <div className="text-center text-[#737373] py-4">Loading attachments...</div>
                ) : attachments.length > 0 ? (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {attachments.map((attachment) => (
                      <div key={attachment.id} className="bg-white border border-[#e5e5e5] rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-[#0a0a0a]">{attachment.displayName || attachment.fileName}</p>
                          <p className="text-xs text-[#737373]">
                            {attachment.user?.firstName ? `${attachment.user.firstName} ${attachment.user.lastName || ''}`.trim() : 'Unknown'} • {attachment.fileSize ? `${(attachment.fileSize / 1024).toFixed(2)} KB` : 'Unknown size'}
                          </p>
                        </div>
                        <a
                          href={attachment.filePath}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-[#0366d6] hover:underline"
                        >
                          Download
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-[#737373] py-4">No attachments yet</div>
                )}

                <button
                  onClick={() => setShowExpandedAttachments(false)}
                  className="text-sm text-[#0366d6] hover:underline"
                >
                  Collapse
                </button>
              </div>
            ) : card.attachmentsCount > 0 ? (
              <button
                onClick={() => setShowExpandedAttachments(true)}
                className="w-full bg-[#f5f5f5] hover:bg-[#ececec] rounded-lg p-4 text-center text-[#737373] text-sm transition-colors"
              >
                {card.attachmentsCount} attachment{card.attachmentsCount !== 1 ? 's' : ''} - Click to expand
              </button>
            ) : (
              <div className="bg-[#f5f5f5] rounded-lg p-4 text-center text-[#737373] text-sm">
                No attachments
              </div>
            )}
          </div>

          {/* Created */}
          <div className="text-xs text-[#b4b4b4] border-t border-[#e5e5e5] pt-4">
            Created on {new Date(card.createdAt).toLocaleDateString([], {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const getPriorityColorClass = (priority: string) => {
  switch (priority) {
    case 'critical':
      return 'bg-red-100 text-red-800';
    case 'high':
      return 'bg-orange-100 text-orange-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'low':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// ─── Kanban card component ────────────────────────────────────────────────────
interface CardProps {
  card: ActionPlan;
  onDragStart: (e: DragEvent<HTMLDivElement>, cardId: string, fromColumn: string) => void;
}

const KanbanCard: React.FC<CardProps> = ({ card, onDragStart }) => {
  const { t } = useTranslation();
  const [showDetails, setShowDetails] = useState(false);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getInitials = (firstName?: string, lastName?: string, username?: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (username) {
      return username
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return 'US';
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500',
      'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500'
    ];
    const hashCode = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hashCode % colors.length];
  };

  return (
    <>
      <div 
        draggable
        onDragStart={(e) => onDragStart(e, card.id, card.status)}
        onClick={() => setShowDetails(true)}
        className="flex flex-col gap-2 items-start bg-white border border-[#e5e5e5] rounded-[14px] p-[22px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] w-full cursor-pointer hover:shadow-[0px_2px_8px_0px_rgba(0,0,0,0.15)] transition-shadow"
      >
        {/* Title + description */}
        <div className="flex flex-col gap-[6px] w-full">
          <p className="font-['IBM_Plex_Sans'] text-[16px] font-bold leading-[1.5] text-[#0a0a0a]">
            {card.name}
          </p>
          <p className="font-['IBM_Plex_Sans'] text-[14px] font-normal leading-[1.5] text-[#737373]">
            {card.description || 'No description'}
          </p>
        </div>

        {/* Assigned User Avatar */}
        <div className="flex items-center gap-2 w-full">
          {card.assignedUser ? (
            <div className="flex items-center gap-2 px-2 py-1 bg-[#f5f5f5] rounded-[6px]">
              <div className={`h-6 w-6 rounded-full ${getAvatarColor(card.assignedUser.username)} flex items-center justify-center text-white font-semibold text-xs`}>
                {getInitials(card.assignedUser.username)}
              </div>
              <span className="font-['IBM_Plex_Sans'] text-[12px] font-medium text-[#0a0a0a] truncate">
                {card.assignedUser.username}
              </span>
            </div>
          ) : (
            <span className="font-['IBM_Plex_Sans'] text-[12px] font-normal text-[#b4b4b4] px-2 py-1">
              Unassigned
            </span>
          )}
        </div>

        {/* Divider */}
        <hr className="w-full border-t border-[#e5e5e5]" />

        {/* Footer: priority badge + meta counts */}
        <div className="flex items-center justify-between w-full">
          <span className={`inline-flex items-center justify-center h-[22px] rounded-[8px] px-[10px] font-['IBM_Plex_Sans'] text-[14px] font-normal leading-[1.5] ${getPriorityColor(card.priority)}`}>
            {card.priority.charAt(0).toUpperCase() + card.priority.slice(1)}
          </span>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <MessagesSquare className="h-3.5 w-3.5 text-[#64748b]" />
              <span className="font-['IBM_Plex_Sans'] text-[14px] font-normal leading-[1.5] text-[#64748b]">{card.commentsCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <Paperclip className="h-3.5 w-3.5 text-[#64748b]" />
              <span className="font-['IBM_Plex_Sans'] text-[14px] font-normal leading-[1.5] text-[#64748b]">{card.attachmentsCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <CardDetailModal card={card} isOpen={showDetails} onClose={() => setShowDetails(false)} />
    </>
  );
};

// ─── Kanban column ────────────────────────────────────────────────────────────
interface KanbanColumnProps {
  title: string;
  columnId: string;
  cards: ActionPlan[];
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDrop: (e: DragEvent<HTMLDivElement>, columnId: string) => void;
  onDragStart: (e: DragEvent<HTMLDivElement>, cardId: string, fromColumn: string) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ 
  title, 
  columnId, 
  cards,
  onDragOver,
  onDrop,
  onDragStart 
}) => (
  <div 
    onDragOver={onDragOver}
    onDrop={(e) => onDrop(e, columnId)}
    className="flex flex-1 min-w-0 flex-col gap-6 bg-[#f5f5f5] border border-[#e5e5e5] rounded-[8px] p-3 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] transition-colors hover:bg-[#f0f0f0]"
  >
    {/* Column header */}
    <div className="flex items-center gap-[10px] shrink-0">
      <span className="font-['IBM_Plex_Sans'] text-[16px] font-normal leading-[1.5] text-[#0f172a]">{title}</span>
      <div className="flex items-center justify-center h-[22px] rounded-[8px] border border-[#d6d6d6] px-[10px]">
        <span className="font-['IBM_Plex_Sans'] text-[12px] font-medium leading-4 text-[#0a0a0a]">{cards.length}</span>
      </div>
    </div>
    {/* Cards */}
    <div className="flex flex-col gap-2 w-full">
      {cards.length === 0 ? (
        <div className="flex items-center justify-center min-h-[200px] text-[#b4b4b4] font-['IBM_Plex_Sans'] text-sm">
          Drop cards here
        </div>
      ) : (
        cards.map((card) => (
          <KanbanCard key={card.id} card={card} onDragStart={onDragStart} />
        ))
      )}
    </div>
  </div>
);

// ─── Page ─────────────────────────────────────────────────────────────────────
export const ActionPlanningBoardPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { t } = useTranslation();
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [draggedFromColumn, setDraggedFromColumn] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // ─── Fetch action plans ───────────────────────────────────────────────────
  const { data: actionPlans = [], isLoading, error } = useQuery<ActionPlan[]>({
    queryKey: ['/api/action-plans'],
    queryFn: getQueryFn({ on401: 'throw' }) as any,
  });

  // ─── Update status mutation ────────────────────────────────────────────────
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await apiRequest('PATCH', `/api/action-plans/${id}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/action-plans'] });
    },
  });

  // ─── Organize cards by status ──────────────────────────────────────────────
  const columns = useMemo(() => ({
    todo: actionPlans.filter(p => p.status === 'todo'),
    in_progress: actionPlans.filter(p => p.status === 'in_progress'),
    completed: actionPlans.filter(p => p.status === 'completed'),
    review: actionPlans.filter(p => p.status === 'review'),
  }), [actionPlans]);

  // ─── Handle drag start ────────────────────────────────────────────────────
  const handleDragStart = (e: DragEvent<HTMLDivElement>, cardId: string, fromColumn: string) => {
    setDraggedCardId(cardId);
    setDraggedFromColumn(fromColumn);
    e.dataTransfer!.effectAllowed = 'move';
  };

  // ─── Handle drag over ─────────────────────────────────────────────────────
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'move';
  };

  // ─── Handle drop ──────────────────────────────────────────────────────────
  const handleDrop = (e: DragEvent<HTMLDivElement>, toColumnId: string) => {
    e.preventDefault();
    
    if (!draggedCardId || !draggedFromColumn) return;

    // Don't move if dropping in the same column
    if (draggedFromColumn === toColumnId) {
      setDraggedCardId(null);
      setDraggedFromColumn(null);
      return;
    }

    // Map columnId to status value
    const statusMap: Record<string, string> = {
      'todo': 'todo',
      'in_progress': 'in_progress',
      'completed': 'completed',
      'review': 'review',
    };

    const newStatus = statusMap[toColumnId];
    if (newStatus) {
      updateStatusMutation.mutate({ id: draggedCardId, status: newStatus });
    }

    setDraggedCardId(null);
    setDraggedFromColumn(null);
  };

  if (isLoading) {
    return (
      <div className="flex h-full bg-[#f1f5f9]">
        <Sidebar items={sidebarItems} compact={!sidebarOpen} onNavigate={(href) => setLocation(href)} onLogout={() => setLocation("/login")} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-semibold">Loading action plans...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full bg-[#f1f5f9]">
        <Sidebar items={sidebarItems} compact={!sidebarOpen} onNavigate={(href) => setLocation(href)} onLogout={() => setLocation("/login")} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-semibold text-red-600">Error loading action plans</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-[#f1f5f9]">
      <Sidebar items={sidebarItems} compact={!sidebarOpen} onNavigate={(href) => setLocation(href)} onLogout={() => setLocation("/login")} />

      <div className="flex flex-1 flex-col overflow-hidden pr-2 py-2">
        <div className="flex flex-1 flex-col overflow-hidden rounded-xl bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)]">

          {/* ── Topbar / breadcrumb ── */}
          <div className="flex h-16 shrink-0 items-center px-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="flex h-7 w-7 items-center justify-center rounded"
              >
                <PanelLeft className="h-4 w-4 text-slate-600" />
              </button>
              <span className="h-4 w-px bg-slate-200" />
              <div className="flex items-center gap-1.5">
                <span className="font-['IBM_Plex_Sans'] text-[14px] font-normal leading-5 text-[#737373]">{t('nav.actionPlans', { defaultValue: 'Action Planning' })}</span>
                <ChevronRight className="h-3.5 w-3.5 text-[#737373]" />
                <span className="font-['IBM_Plex_Sans'] text-[14px] font-normal leading-5 text-[#0f172a]">{t('actionPlans.planBoard', { defaultValue: 'Plan Board' })}</span>
              </div>
            </div>
          </div>

          {/* ── Scrollable content ── */}
          <div className="flex-1 overflow-auto py-6">
            <div className="flex flex-col gap-4 px-6">

              {/* Page title row */}
              <div className="flex items-center justify-between">
                <h1 className="font-['IBM_Plex_Sans'] text-[24px] font-semibold leading-[1.3] text-[#0f172a]">
                  {t('actionPlans.title', { defaultValue: 'Action Planning Board' })}
                </h1>
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="flex h-8 items-center justify-center gap-2 rounded-[8px] bg-[#020617] px-3 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.1)] hover:bg-slate-800">
                  <Plus className="h-4 w-4 text-[#fafafa]" />
                  <span className="font-['IBM_Plex_Sans'] text-[14px] font-medium leading-[1.5] text-[#fafafa]">{t('actionPlans.createPlan', { defaultValue: 'Create Action' })}</span>
                </button>
              </div>

              {/* ── Kanban board ── */}
              <div className="flex gap-3 items-start">
                <KanbanColumn 
                  title={t('actionPlans.kanban.todo', { defaultValue: 'To-Do' })} 
                  columnId="todo"
                  cards={columns.todo}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onDragStart={handleDragStart}
                />
                <KanbanColumn 
                  title={t('actionPlans.kanban.inProgress', { defaultValue: 'In Progress' })} 
                  columnId="in_progress"
                  cards={columns.in_progress}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onDragStart={handleDragStart}
                />
                <KanbanColumn 
                  title={t('actionPlans.kanban.completed', { defaultValue: 'Completed' })} 
                  columnId="completed"
                  cards={columns.completed}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onDragStart={handleDragStart}
                />
                <KanbanColumn 
                  title={t('actionPlans.kanban.review', { defaultValue: 'Review' })} 
                  columnId="review"
                  cards={columns.review}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onDragStart={handleDragStart}
                />
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Create Action Plan Modal */}
      <NewActionPlanModal 
        open={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
      />
    </div>
  );
};
