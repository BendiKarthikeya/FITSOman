// Profile image utility functions

/**
 * Get a reliable profile image URL with proper fallbacks
 */
export function getProfileImageUrl(profileImageUrl: string | null | undefined): string {
  // If we have a valid profile image URL, return it
  if (profileImageUrl && profileImageUrl.trim() !== '') {
    return profileImageUrl;
  }
  
  // Default fallback to the placeholder
  return '/uploads/placeholder.svg';
}

/**
 * Get user initials for avatar fallbacks
 */
export function getUserInitials(fullName?: string | null, username?: string | null): string {
  if (fullName && fullName.trim()) {
    const names = fullName.trim().split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return names[0][0].toUpperCase();
  }
  
  if (username && username.trim()) {
    return username[0].toUpperCase();
  }
  
  return 'U'; // Default fallback
}