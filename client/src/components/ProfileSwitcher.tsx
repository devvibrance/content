import { useState, useEffect, useRef } from "react";
import { User, Check, Plus, Trash2, Settings2, Upload } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getAllProfiles,
  getActiveProfileId,
  setActiveProfileId,
  createProfile,
  deleteProfile,
  updateProfile,
  type ProfileData,
} from "@/lib/indexedDB";

export function ProfileSwitcher() {
  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [activeProfileId, setActiveId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState<ProfileData | null>(null);
  const [newProfileName, setNewProfileName] = useState("");
  const [newProfileHandle, setNewProfileHandle] = useState("");
  const [newProfileLabel, setNewProfileLabel] = useState("");
  const [newProfilePic, setNewProfilePic] = useState<string | null>(null);
  const newProfilePicInputRef = useRef<HTMLInputElement>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [profileToEdit, setProfileToEdit] = useState<ProfileData | null>(null);
  const [editProfileName, setEditProfileName] = useState("");
  const [editProfileHandle, setEditProfileHandle] = useState("");
  const [editProfileLabel, setEditProfileLabel] = useState("");
  const [editProfilePic, setEditProfilePic] = useState<string | null>(null);
  const editProfilePicInputRef = useRef<HTMLInputElement>(null);

  const loadProfiles = async () => {
    const allProfiles = await getAllProfiles();
    const activeId = await getActiveProfileId();
    setProfiles(allProfiles);
    setActiveId(activeId);
  };

  useEffect(() => {
    loadProfiles();

    const handleProfilesUpdate = () => {
      loadProfiles();
    };

    window.addEventListener("profilesListUpdated", handleProfilesUpdate);
    window.addEventListener("activeProfileChanged", handleProfilesUpdate);

    return () => {
      window.removeEventListener("profilesListUpdated", handleProfilesUpdate);
      window.removeEventListener("activeProfileChanged", handleProfilesUpdate);
    };
  }, []);

  const activeProfile = profiles.find((p) => p.id === activeProfileId);

  const handleSwitchProfile = async (profileId: string) => {
    await setActiveProfileId(profileId);
    setIsOpen(false);
  };

  const handleCreateProfile = async () => {
    if (!newProfileName.trim()) return;

    const handle = newProfileHandle.trim() || `@${newProfileName.toLowerCase().replace(/\s+/g, "")}`;

    const newProfile = await createProfile({
      username: newProfileName.trim(),
      handle: handle.startsWith("@") ? handle : `@${handle}`,
      profilePic: newProfilePic,
      isVerified: false,
      isInstagramVerified: false,
      label: newProfileLabel.trim() || undefined,
    });

    await setActiveProfileId(newProfile.id);
    setIsDialogOpen(false);
    setNewProfileName("");
    setNewProfilePic(null);
    setNewProfileHandle("");
    setNewProfileLabel("");
  };

  const handleDeleteClick = (e: React.MouseEvent, profile: ProfileData) => {
    e.stopPropagation();
    setProfileToDelete(profile);
    setIsDeleteDialogOpen(true);
    setIsOpen(false);
  };

  const handleEditClick = (e: React.MouseEvent, profile: ProfileData) => {
    e.stopPropagation();
    setProfileToEdit(profile);
    setEditProfileName(profile.username);
    setEditProfileHandle(profile.handle || "");
    setEditProfileLabel(profile.label || "");
    setEditProfilePic(profile.profilePic || null);
    setIsEditDialogOpen(true);
    setIsOpen(false);
  };

  const handleEditProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditProfilePic(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfile = async () => {
    if (!profileToEdit || !editProfileName.trim()) return;

    const handle = editProfileHandle.trim() || `@${editProfileName.toLowerCase().replace(/\s+/g, "")}`;

    await updateProfile({
      ...profileToEdit,
      username: editProfileName.trim(),
      handle: handle.startsWith("@") ? handle : `@${handle}`,
      label: editProfileLabel.trim() || undefined,
      profilePic: editProfilePic,
    });

    setIsEditDialogOpen(false);
    setProfileToEdit(null);
    setEditProfileName("");
    setEditProfileHandle("");
    setEditProfileLabel("");
    setEditProfilePic(null);
  };

  const handleConfirmDelete = async () => {
    if (!profileToDelete) return;

    const wasActive = profileToDelete.id === activeProfileId;
    await deleteProfile(profileToDelete.id);

    // If we deleted the active profile, switch to another one
    if (wasActive) {
      const remaining = profiles.filter((p) => p.id !== profileToDelete.id);
      if (remaining.length > 0) {
        await setActiveProfileId(remaining[0].id);
      }
    }

    setIsDeleteDialogOpen(false);
    setProfileToDelete(null);
  };

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full transition-all duration-300 relative group hover-elevate hover:scale-105"
            data-testid="profile-switcher-trigger"
          >
            {activeProfile?.profilePic ? (
              <img
                src={activeProfile.profilePic}
                alt="Profile"
                className="w-5 h-5 rounded-full object-cover"
              />
            ) : (
              <User className="w-5 h-5" />
            )}
            <span className="absolute left-full ml-3 top-0 px-3 py-1.5 bg-black/40 backdrop-blur-md text-white text-sm rounded-[8px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg">
              Switch Profile
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          side="right"
          sideOffset={12}
          className="w-64 bg-[#0E0E0E]/95 border-0 text-white rounded-xl"
        >
          <div className="px-3 py-2 text-xs font-medium text-white/50 uppercase tracking-wider">
            Profiles
          </div>
          {profiles.map((profile) => (
            <DropdownMenuItem
              key={profile.id}
              onClick={() => handleSwitchProfile(profile.id)}
              className="flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-white/10 focus:bg-white/10 group/item"
              data-testid={`profile-item-${profile.id}`}
            >
              <div className="flex-shrink-0">
                {profile.profilePic ? (
                  <img
                    src={profile.profilePic}
                    alt={profile.username}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-white/40" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="font-medium text-sm truncate">{profile.username}</span>
                  {profile.isOrganization ? (
                    <svg
                      viewBox="0 0 22 22"
                      className="w-4 h-4 text-[#e2b719] flex-shrink-0"
                      fill="currentColor"
                    >
                      <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"></path>
                    </svg>
                  ) : profile.isVerified ? (
                    <svg
                      viewBox="0 0 22 22"
                      className="w-4 h-4 text-[#1d9bf0] flex-shrink-0"
                      fill="currentColor"
                    >
                      <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"></path>
                    </svg>
                  ) : null}
                </div>
                <div className="text-xs text-white/50 truncate">
                  {profile.label || profile.handle}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                <button
                  onClick={(e) => handleEditClick(e, profile)}
                  className="p-1 rounded-md invisible group-hover/item:visible hover:bg-white/20 transition-all"
                  data-testid={`edit-profile-${profile.id}`}
                >
                  <Settings2 className="w-3.5 h-3.5 text-white/50 hover:text-white transition-colors" />
                </button>
                {profiles.length > 1 && (
                  <button
                    onClick={(e) => handleDeleteClick(e, profile)}
                    className="p-1 rounded-md invisible group-hover/item:visible hover:bg-white/20 transition-all"
                    data-testid={`delete-profile-${profile.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-white/50 hover:text-red-400 transition-colors" />
                  </button>
                )}
                {profile.id === activeProfileId && (
                  <Check className="w-3.5 h-3.5 text-[#1d9bf0]" />
                )}
              </div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator className="bg-white/10" />
          <DropdownMenuItem
            onClick={() => {
              setIsOpen(false);
              setIsDialogOpen(true);
            }}
            className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-white/10 focus:bg-white/10"
          >
            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
              <Plus className="w-4 h-4 text-white/60" />
            </div>
            <span className="text-sm">Add New Profile</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md bg-[#0E0E0E]/95 border-0 text-white rounded-xl">
          <DialogHeader>
            <DialogTitle>Create New Profile</DialogTitle>
            <DialogDescription className="text-white/60">
              Add a new profile to manage multiple accounts
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2" onKeyDown={(e) => { if (e.key === "Enter" && newProfileName.trim()) handleCreateProfile(); }}>
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center cursor-pointer overflow-hidden flex-shrink-0 hover:bg-white/15 transition-colors"
                onClick={() => newProfilePicInputRef.current?.click()}
              >
                {newProfilePic ? (
                  <img src={newProfilePic} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <Upload className="w-5 h-5 text-white/40" />
                )}
              </div>
              <input
                ref={newProfilePicInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => setNewProfilePic(ev.target?.result as string);
                    reader.readAsDataURL(file);
                  }
                  e.target.value = "";
                }}
              />
              <p className="text-xs text-white/40">Tap to add a profile picture</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-name" className="text-white">
                Display Name
              </Label>
              <Input
                id="profile-name"
                placeholder="e.g., My Business"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                className="bg-white/5 border-0 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-handle" className="text-white">
                Handle (optional)
              </Label>
              <Input
                id="profile-handle"
                placeholder="e.g., @mybusiness"
                value={newProfileHandle}
                onChange={(e) => setNewProfileHandle(e.target.value)}
                className="bg-white/5 border-0 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-label" className="text-white">
                Label (optional)
              </Label>
              <Input
                id="profile-label"
                placeholder="e.g., Business, Personal, Client"
                value={newProfileLabel}
                onChange={(e) => setNewProfileLabel(e.target.value)}
                className="bg-white/5 border-0 text-white"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="bg-white/5 border-0 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateProfile}
                disabled={!newProfileName.trim()}
                className="bg-primary hover:bg-primary/90"
              >
                Create Profile
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md bg-[#0E0E0E]/95 border-0 text-white rounded-xl">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription className="text-white/60">
              Update your profile details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-4">
              <div 
                className="relative w-16 h-16 rounded-full bg-white/10 flex items-center justify-center cursor-pointer overflow-hidden group"
                onClick={() => editProfilePicInputRef.current?.click()}
              >
                {editProfilePic ? (
                  <img src={editProfilePic} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-white/40" />
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Upload className="w-5 h-5 text-white" />
                </div>
              </div>
              <input
                ref={editProfilePicInputRef}
                type="file"
                accept="image/*"
                onChange={handleEditProfilePicChange}
                className="hidden"
              />
              <div className="flex-1">
                <p className="text-sm text-white/60">Profile Picture</p>
                <button 
                  onClick={() => editProfilePicInputRef.current?.click()}
                  className="text-sm text-primary hover:underline"
                >
                  Upload new photo
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-profile-name" className="text-white">
                Display Name
              </Label>
              <Input
                id="edit-profile-name"
                placeholder="e.g., My Business"
                value={editProfileName}
                onChange={(e) => setEditProfileName(e.target.value)}
                className="bg-white/5 border-0 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-profile-handle" className="text-white">
                Handle
              </Label>
              <Input
                id="edit-profile-handle"
                placeholder="e.g., @mybusiness"
                value={editProfileHandle}
                onChange={(e) => setEditProfileHandle(e.target.value)}
                className="bg-white/5 border-0 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-profile-label" className="text-white">
                Label (optional)
              </Label>
              <Input
                id="edit-profile-label"
                placeholder="e.g., Business, Personal, Client"
                value={editProfileLabel}
                onChange={(e) => setEditProfileLabel(e.target.value)}
                className="bg-white/5 border-0 text-white"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                className="bg-white/5 border-0 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateProfile}
                disabled={!editProfileName.trim()}
                className="bg-primary hover:bg-primary/90"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-[#0E0E0E]/95 border-0 text-white rounded-xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white text-lg font-semibold">Delete Profile</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60 text-sm">
              Are you sure you want to delete "{profileToDelete?.username}"? This will also delete all saved content associated with this profile. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="bg-white/10 border-0 text-white hover:bg-white/20 rounded-lg">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-500 hover:bg-red-600 text-white border-0 rounded-lg"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
