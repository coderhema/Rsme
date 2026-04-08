
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Settings, 
  LogOut, 
  Key, 
  CreditCard,
  Xmark as X 
} from 'iconoir-react';
import DitheringAvatar from './DitheringAvatar';

interface UserAccount {
  name: string;
  email: string;
  seed: string;
}

interface AccountDropdownProps {
  user: UserAccount;
  onLogout: () => void;
  isOpen: boolean;
  onToggle: () => void;
  isCollapsed?: boolean;
}

const AccountDropdown: React.FC<AccountDropdownProps> = ({ 
  user, onLogout, isOpen, onToggle, isCollapsed 
}) => {
  const [activeModal, setActiveModal] = useState<'profile' | 'settings' | null>(null);

  const menuItems = [
    { icon: User, label: 'Profile', action: () => setActiveModal('profile') },
    { icon: Settings, label: 'Settings', action: () => setActiveModal('settings') },
    { icon: Key, label: 'Security', action: () => {} },
    { icon: CreditCard, label: 'Billing', action: () => {} },
  ];

  return (
    <div className="relative isolate">
      <button
        onClick={onToggle}
        className={`flex items-center gap-3 p-2 rounded-xl transition-all duration-300 group ${isOpen ? 'bg-violet-400/10' : 'hover:bg-white/5 backdrop-blur-md bg-white/2'}`}
      >
        <DitheringAvatar seed={user.seed} size={isCollapsed ? 36 : 32} />
        {!isCollapsed && (
          <div className="flex flex-col items-start min-w-[120px]">
            <span className="text-xs font-bold text-white truncate w-full text-left">{user.name}</span>
            <span className="text-[10px] text-gray-500 truncate w-full text-left">{user.email}</span>
          </div>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onToggle}
              className="fixed inset-0 z-[60]"
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={`absolute top-full mt-4 right-0 ${isCollapsed ? 'left-0' : 'w-[240px]'} bg-[#1A1A1A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[70]`}
              style={{
                fontFamily: "var(--font-sans)",
                backdropFilter: 'blur(10px)'
              }}
            >
              <div className="p-2 flex flex-col gap-1">
                {menuItems.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      item.action();
                      onToggle();
                    }}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all text-left"
                  >
                    <item.icon width={18} height={18} />
                    <span className="text-[11px] font-bold uppercase tracking-wider">{item.label}</span>
                  </button>
                ))}
                <div className="h-[1px] bg-white/5 my-1 mx-2" />
                <button
                  onClick={onLogout}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-red-400/70 hover:text-red-400 hover:bg-red-400/10 transition-all text-left"
                >
                  <LogOut width={18} height={18} />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Log out</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveModal(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              layoutId="account-modal"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-[#1A1A1A] border border-white/10 rounded-[32px] shadow-2xl overflow-hidden"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              <div className="flex h-[480px]">
                {/* Modal Sidebar */}
                <div className="w-64 border-r border-white/5 p-8 flex flex-col gap-6">
                  <div className="flex items-center gap-4 mb-4">
                    <DitheringAvatar seed={user.seed} size={48} />
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-white">{user.name}</span>
                      <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Free Plan</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {['Profile', 'Settings', 'Notifications', 'Security', 'Billing'].map(item => (
                      <button 
                        key={item}
                        className={`text-left px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all ${activeModal === item.toLowerCase() ? 'bg-violet-400 text-black' : 'text-gray-500 hover:bg-white/5 hover:text-white'}`}
                        onClick={() => setActiveModal(item.toLowerCase() as any)}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Modal Content */}
                <div className="flex-1 p-10 relative overflow-y-auto">
                  <button 
                    onClick={() => setActiveModal(null)}
                    className="absolute top-6 right-6 p-2 text-gray-500 hover:text-white transition-colors"
                  >
                    <X width={20} height={20} />
                  </button>

                  <h2 className="text-2xl font-black text-white mb-8 uppercase tracking-tighter">
                    {activeModal.toUpperCase()}
                  </h2>

                  {activeModal === 'profile' && (
                    <div className="flex flex-col gap-6">
                       <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">Full Name</label>
                        <input defaultValue={user.name} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-400/50" />
                       </div>
                       <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">Email Address</label>
                        <input defaultValue={user.email} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-400/50" />
                       </div>
                       <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">Bio</label>
                        <textarea className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-400/50 resize-none h-24" placeholder="Tell us about yourself..." />
                       </div>
                       <button className="mt-4 bg-violet-400 text-black font-black text-[10px] uppercase tracking-[0.2em] py-4 rounded-xl shadow-xl hover:bg-violet-300 transition-all">Save Changes</button>
                    </div>
                  )}

                  {activeModal === 'settings' && (
                    <div className="flex flex-col gap-8">
                       <div className="flex items-center justify-between">
                         <div>
                            <div className="text-sm font-bold text-white uppercase tracking-tight">Dark Mode</div>
                            <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-1">System default active</div>
                         </div>
                         <div className="w-12 h-6 bg-violet-400 rounded-full flex items-center px-1">
                           <div className="w-4 h-4 bg-black rounded-full ml-auto" />
                         </div>
                       </div>
                       <div className="flex items-center justify-between">
                         <div>
                            <div className="text-sm font-bold text-white uppercase tracking-tight">AI Suggestions</div>
                            <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-1">Realtime analysis of resume</div>
                         </div>
                         <div className="w-12 h-6 bg-violet-400 rounded-full flex items-center px-1">
                           <div className="w-4 h-4 bg-black rounded-full ml-auto" />
                         </div>
                       </div>
                       <div className="flex items-center justify-between">
                         <div>
                            <div className="text-sm font-bold text-white uppercase tracking-tight">Privacy Mode</div>
                            <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-1">Anonymize personal data in AI calls</div>
                         </div>
                         <div className="w-12 h-6 bg-white/10 rounded-full flex items-center px-1">
                           <div className="w-4 h-4 bg-gray-500 rounded-full" />
                         </div>
                       </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AccountDropdown;
