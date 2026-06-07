const fs = require('fs');

const content = fs.readFileSync('src/components/ChatScreen.tsx', 'utf8');

const target = `                {/* Inline PM Dropdown Container */}
                <div className="relative dropdown-container flex items-center">
                  <button
                    onClick={() => toggleDropdown("pmList")}
                    className={\`flex items-center justify-center p-0.5 rounded-md hover:bg-white/10 transition-colors relative cursor-pointer \${showPmListDropdown ? "text-green-400" : "text-gray-400"}\`}
                    title="الرسائل الخاصة"
                  >
                    <span className="text-xs">💌</span>
                    {Object.keys(pmThreads).length > 0 && <span className="absolute -top-0.5 -right-0.5 bg-red-500 w-1.5 h-1.5 rounded-full border border-black animate-pulse"></span>}
                  </button>

                  {/* PM List Dropdown */}
                  <AnimatePresence>
                    {showPmListDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 mt-2 w-[280px] bg-[#0a0f0c] border border-green-500/20 shadow-2xl rounded-2xl z-50 overflow-hidden flex flex-col"
                      >
                        <div className="flex items-center justify-between p-3 border-b border-green-500/10 bg-black/40">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">💌</span>
                            <h3 className="font-black text-white text-sm">المحادثات الخاصة</h3>
                          </div>
                          <button 
                            onClick={() => setShowPmListDropdown(false)}
                            className="p-1.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        
                        <div className="p-3 bg-black/20 text-right space-y-2 max-h-[350px] overflow-y-auto">
                          {Object.keys(pmThreads).length === 0 ? (
                            <p className="text-[11px] text-gray-400 font-bold text-center py-4">لا توجد محادثات الخاصة بعد.</p>
                          ) : (
                            Object.keys(pmThreads).map(nickname => {
                              const lastMsg = pmThreads[nickname]?.[pmThreads[nickname].length - 1];
                              const targetUser = chatMembers.find(m => m.nickname === nickname) || { nickname, color: "#a3e635" };
                              return (
                                <div 
                                  key={nickname}
                                  onClick={() => {
                                    setPmTarget(targetUser as any);
                                    if (window.innerWidth < 1280) setMobileTab("private");
                                    else setIsPmOpen(true);
                                    setShowPmListDropdown(false);
                                  }}
                                  className="p-2.5 bg-black/40 hover:bg-white/5 rounded-xl border border-green-500/10 hover:border-green-500/30 transition-all flex items-center gap-2.5 cursor-pointer"
                                >
                                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 text-xl overflow-hidden shadow-inner relative">
                                    👤
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <h4 className="text-[12px] font-black" style={{ color: targetUser.color || "#fff" }}>{nickname}</h4>
                                      <span className="text-[9px] text-gray-500">{lastMsg?.time || ""}</span>
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">{lastMsg?.isOwn ? \`أنت: \${lastMsg.text}\` : lastMsg?.text}</p>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>

                {/* Other Controls icons (PM, Notifications) */}
          <div className="flex items-center gap-1.5">

          </div>alse);
              setShowAttachmentDropdown(false);
              setShowMusicDropdown(false);
              setShowEmojiPicker(false);
              setShowCommandsDropdown(false);
              setShowPrivacyDropdown(false);
              setShowSettingsDropdown(false);
              setShowSearchPop(false);
              setShowUserContextPop(false);
              setShowUserProfileBioPop(false);
              setShowProfileModal(false);
              setIsPmOpen(false);
              setIsMobileMenuOpen(false);

              if (window.innerWidth < 768) {
                setMobileTab("members"); // on mobile, Members tab shows the sidebar
              }
              
              if (isSidebarOpen && activeSidebarTab === "members") {
                setIsSidebarOpen(false);
              } else {
                setIsSidebarOpen(true);
                setActiveSidebarTab("members");
              }
            }}
            className={\`sidebar-toggle-btn w-9 h-9 flex items-center justify-center rounded-xl border transition-all relative cursor-pointer flex-shrink-0 \${isSidebarOpen && activeSidebarTab === "members" ? "bg-green-500/10 border-green-500/20 text-green-400" : "border-transparent hover:border-green-500/10 hover:bg-white/5 text-gray-300 hover:text-white"}\`}
            title="المتصلون (128)"
          >
            <Users size={16} />
            <span className="absolute top-1 right-1 bg-green-500 w-2 h-2 rounded-full border border-black animate-pulse"></span>
          </button>

          {/* Other Controls icons (PM, Notifications) */}
          <div className="flex items-center gap-1.5">



            <div className="relative dropdown-container">
              <button
                onClick={() => toggleDropdown("notifications")}
                className={\`w-9 h-9 flex items-center justify-center rounded-xl border transition-all relative cursor-pointer flex-shrink-0 \${showNotificationsDropdown ? "bg-green-500/10 border-green-500/20 text-green-400" : "border-transparent hover:border-green-500/10 hover:bg-white/5 text-gray-300 hover:text-white"}\`}
                title="الإشعارات"
              >
                <span className="text-lg">🔔</span>
                <span className="absolute top-1 right-1 bg-red-500 w-2 h-2 rounded-full border border-black animate-pulse"></span>
              </button>

              {/* Notifications Dropdown */}
              <AnimatePresence>
                {showNotificationsDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 mt-2 w-[280px] sm:w-[320px] bg-[#0a0f0c] border border-green-500/20 shadow-2xl rounded-2xl z-50 overflow-hidden flex flex-col"
                  >
                    <div className="flex items-center justify-between p-3 border-b border-green-500/10 bg-black/40">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🔔</span>
                        <h3 className="font-black text-white text-sm">مركز الإشعارات</h3>
                      </div>
                      <button 
                        onClick={() => setShowNotificationsDropdown(false)}
                        className="p-1.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    
                    <div className="p-3 bg-black/20 text-right space-y-2 max-h-[350px] overflow-y-auto">
                       <p className="text-[11px] text-gray-400 font-bold border-b border-green-500/10 pb-2">أحدث التنبيهات والأحداث الخاصة بك في البرنامج.</p>
                       
                       <div className="grid gap-2">
                         <div className="p-2.5 bg-black/40 rounded-xl border border-green-500/20 flex items-start gap-2.5">
                           <div className="w-7 h-7 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center flex-shrink-0">
                             <Heart size={12} />
                           </div>
                           <div className="flex-1">
                             <h4 className="text-[11px] font-black text-white">إعجاب بملفك الشخصي</h4>
                             <p className="text-[9px] text-gray-400 mt-0.5">قام <strong>عمر</strong> بتسجيل إعجابه بملفك الشخصي.</p>
                             <span className="text-[8px] text-gray-500 font-mono mt-1 block">منذ 5 دقائق</span>
                           </div>
                         </div>
  
                         <div className="p-2.5 bg-black/40 rounded-xl border border-green-500/10 flex items-start gap-2.5 opacity-80">
                           <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0">
                             <Users size={12} />
                           </div>
                           <div className="flex-1">
                             <h4 className="text-[11px] font-black text-white">طلب صداقة جديد</h4>
                             <p className="text-[9px] text-gray-400 mt-0.5">أرسل لك <strong>سارة</strong> طلب صداقة.</p>
                             <div className="flex gap-1.5 mt-1.5">
                               <button className="px-2.5 py-1 bg-green-500 text-black font-bold text-[8px] rounded-md">قبول</button>
                               <button className="px-2.5 py-1 bg-white/10 text-white font-bold text-[8px] rounded-md hover:bg-red-500">رفض</button>
                             </div>
                             <span className="text-[8px] text-gray-500 font-mono mt-1 block">منذ 3 ساعات</span>
                           </div>
                         </div>
                         
                         <div className="p-2.5 bg-black/40 rounded-xl border border-yellow-500/10 flex items-start gap-2.5 opacity-60">
                           <div className="w-7 h-7 rounded-full bg-yellow-500/20 text-yellow-500 flex items-center justify-center flex-shrink-0">
                             <Crown size={12} />
                           </div>
                           <div className="flex-1">
                             <h4 className="text-[11px] font-black text-white">ترقية الحساب</h4>
                             <p className="text-[9px] text-gray-400 mt-0.5">انتهى اشتراك VIP الخاص بك. جدد الآن للحصول على الشارات.</p>
                             <span className="text-[8px] text-gray-500 font-mono mt-1 block">الأمس</span>
                           </div>
                         </div>
                       </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>`;

const replacement = `                {/* Inline PM Dropdown Container */}
                <div className="relative dropdown-container flex items-center">
                  <button
                    onClick={() => toggleDropdown("pmList")}
                    className={\`flex items-center justify-center p-0.5 rounded-md hover:bg-white/10 transition-colors relative cursor-pointer \${showPmListDropdown ? "text-green-400" : "text-gray-400"}\`}
                    title="الرسائل الخاصة"
                  >
                    <span className="text-xs">💌</span>
                    {Object.keys(pmThreads).length > 0 && <span className="absolute -top-0.5 -right-0.5 bg-red-500 w-1.5 h-1.5 rounded-full border border-black animate-pulse"></span>}
                  </button>

                  <AnimatePresence>
                    {showPmListDropdown && (
                      <motion.div
                        drag
                        dragConstraints={{ left: -300, right: 300, top: -50, bottom: 500 }}
                        dragMomentum={false}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="fixed top-20 left-4 md:left-auto md:right-1/4 w-[280px] bg-[#0a0f0c]/98 border border-green-500/20 shadow-2xl rounded-2xl z-[99] flex flex-col backdrop-blur-md"
                        style={{ resize: "both", overflow: "hidden", minWidth: "250px", minHeight: "250px", maxWidth: "90vw", maxHeight: "80vh" }}
                      >
                        <div className="flex items-center justify-between p-3 border-b border-green-500/10 bg-black/40 cursor-grab active:cursor-grabbing">
                          <div className="flex items-center gap-2 pointer-events-none">
                            <span className="text-lg">💌</span>
                            <h3 className="font-black text-white text-sm">المحادثات الخاصة</h3>
                          </div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setShowPmListDropdown(false); }}
                            className="p-1.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all cursor-pointer z-50 relative"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        
                        <div className="p-3 bg-transparent text-right space-y-2 flex-1 overflow-y-auto">
                          {Object.keys(pmThreads).length === 0 ? (
                            <p className="text-[11px] text-gray-400 font-bold text-center py-4">لا توجد محادثات الخاصة بعد.</p>
                          ) : (
                            Object.keys(pmThreads).map(nickname => {
                              const lastMsg = pmThreads[nickname]?.[pmThreads[nickname].length - 1];
                              const targetUser = chatMembers.find(m => m.nickname === nickname) || { nickname, color: "#a3e635" };
                              return (
                                <div 
                                  key={nickname}
                                  onClick={() => {
                                    setPmTarget(targetUser as any);
                                    if (window.innerWidth < 1280) setMobileTab("private");
                                    else setIsPmOpen(true);
                                    setShowPmListDropdown(false);
                                  }}
                                  className="p-2.5 bg-black/40 hover:bg-white/5 rounded-xl border border-green-500/10 hover:border-green-500/30 transition-all flex items-center gap-2.5 cursor-pointer relative z-40"
                                >
                                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 text-xl overflow-hidden shadow-inner relative">
                                    👤
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <h4 className="text-[12px] font-black" style={{ color: targetUser.color || "#fff" }}>{nickname}</h4>
                                      <span className="text-[9px] text-gray-500">{lastMsg?.time || ""}</span>
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">{lastMsg?.isOwn ? \`أنت: \${lastMsg.text}\` : lastMsg?.text}</p>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Inline Notifications Dropdown Container */}
                <div className="relative dropdown-container flex items-center">
                  <button
                    onClick={() => toggleDropdown("notifications")}
                    className={\`flex items-center justify-center p-0.5 rounded-md hover:bg-white/10 transition-colors relative cursor-pointer ml-2 \${showNotificationsDropdown ? "text-green-400" : "text-gray-400"}\`}
                    title="الإشعارات"
                  >
                    <span className="text-xs">🔔</span>
                    <span className="absolute -top-0.5 -right-0.5 bg-red-500 w-1.5 h-1.5 rounded-full border border-black animate-pulse"></span>
                  </button>

                  <AnimatePresence>
                    {showNotificationsDropdown && (
                      <motion.div
                        drag
                        dragConstraints={{ left: -300, right: 300, top: -50, bottom: 500 }}
                        dragMomentum={false}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="fixed top-20 left-4 md:left-auto md:right-1/3 w-[280px] sm:w-[320px] bg-[#0a0f0c]/98 border border-green-500/20 shadow-2xl rounded-2xl z-[99] flex flex-col backdrop-blur-md"
                        style={{ resize: "both", overflow: "hidden", minWidth: "250px", minHeight: "250px", maxWidth: "90vw", maxHeight: "80vh" }}
                      >
                        <div className="flex items-center justify-between p-3 border-b border-green-500/10 bg-black/40 cursor-grab active:cursor-grabbing">
                          <div className="flex items-center gap-2 pointer-events-none">
                            <span className="text-lg">🔔</span>
                            <h3 className="font-black text-white text-sm">مركز الإشعارات</h3>
                          </div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setShowNotificationsDropdown(false); }}
                            className="p-1.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all cursor-pointer z-50 relative"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        
                        <div className="p-3 bg-transparent text-right space-y-2 flex-1 overflow-y-auto">
                           <p className="text-[11px] text-gray-400 font-bold border-b border-green-500/10 pb-2">أحدث التنبيهات والأحداث الخاصة بك في البرنامج.</p>
                           
                           <div className="grid gap-2">
                             <div className="p-2.5 bg-black/40 rounded-xl border border-green-500/20 flex items-start gap-2.5 relative z-40">
                               <div className="w-7 h-7 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center flex-shrink-0">
                                 <Heart size={12} />
                               </div>
                               <div className="flex-1">
                                 <h4 className="text-[11px] font-black text-white">إعجاب بملفك الشخصي</h4>
                                 <p className="text-[9px] text-gray-400 mt-0.5">قام <strong>عمر</strong> بتسجيل إعجابه بملفك الشخصي.</p>
                                 <span className="text-[8px] text-gray-500 font-mono mt-1 block">منذ 5 دقائق</span>
                               </div>
                             </div>
      
                             <div className="p-2.5 bg-black/40 rounded-xl border border-green-500/10 flex items-start gap-2.5 opacity-80 relative z-40">
                               <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0">
                                 <Users size={12} />
                               </div>
                               <div className="flex-1">
                                 <h4 className="text-[11px] font-black text-white">طلب صداقة جديد</h4>
                                 <p className="text-[9px] text-gray-400 mt-0.5">أرسل لك <strong>سارة</strong> طلب صداقة.</p>
                                 <div className="flex gap-1.5 mt-1.5">
                                   <button className="px-2.5 py-1 bg-green-500 text-black font-bold text-[8px] rounded-md cursor-pointer">قبول</button>
                                   <button className="px-2.5 py-1 bg-white/10 text-white font-bold text-[8px] rounded-md hover:bg-red-500 cursor-pointer">رفض</button>
                                 </div>
                                 <span className="text-[8px] text-gray-500 font-mono mt-1 block">منذ 3 ساعات</span>
                               </div>
                             </div>
                             
                             <div className="p-2.5 bg-black/40 rounded-xl border border-yellow-500/10 flex items-start gap-2.5 opacity-60 relative z-40">
                               <div className="w-7 h-7 rounded-full bg-yellow-500/20 text-yellow-500 flex items-center justify-center flex-shrink-0">
                                 <Crown size={12} />
                               </div>
                               <div className="flex-1">
                                 <h4 className="text-[11px] font-black text-white">ترقية الحساب</h4>
                                 <p className="text-[9px] text-gray-400 mt-0.5">انتهى اشتراك VIP الخاص بك. جدد الآن للحصول على الشارات.</p>
                                 <span className="text-[8px] text-gray-500 font-mono mt-1 block">الأمس</span>
                               </div>
                             </div>
                           </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>

          <div className="h-6 w-[1px] bg-green-500/10 hidden sm:block mx-1" />

          {/* Master Settings / Utilities Dropdown */}
          <div className="relative dropdown-container">
            <button
              onClick={() => toggleDropdown("headerMenu")}
              className={\`w-9 h-9 flex items-center justify-center rounded-xl border transition-all cursor-pointer flex-shrink-0 \${showHeaderMenu ? "bg-green-500/10 border-green-500/20 text-green-400" : "border-transparent hover:border-green-500/10 hover:bg-white/5 text-gray-300 hover:text-white"}\`}
              title="القائمة والإعدادات"
            >
              <SettingsIcon size={16} />
            </button>
            <AnimatePresence>
              {showHeaderMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full right-0 mt-2 w-[220px] bg-[#0a0f0c] border border-green-500/20 shadow-2xl rounded-2xl z-50 overflow-hidden flex flex-col py-1"
                >
                  <button
                    onClick={() => { setIsCompactView(!isCompactView); setShowHeaderMenu(false); }}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-gray-300 hover:text-white transition-all text-sm w-full text-right"
                  >
                    <Grid size={16} className={isCompactView ? "text-green-400" : ""} />
                    <span>{isCompactView ? "إلغاء العرض المدمج" : "العرض المدمج للرسائل"}</span>
                  </button>
                  <button
                    onClick={() => { setIsZenMode(true); setIsSidebarOpen(false); setIsPmOpen(false); setShowHeaderMenu(false); }}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-gray-300 hover:text-white transition-all text-sm w-full text-right"
                  >
                    <span className="text-xl leading-none">🌌</span>
                    <span>وضع التركيز (Zen)</span>
                  </button>
                  <button
                    onClick={() => { handleCopyLink(); setShowHeaderMenu(false); }}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-gray-300 hover:text-white transition-all text-sm w-full text-right"
                  >
                    <Share2 size={16} />
                    <span>دعوة الأصدقاء</span>
                  </button>
                  <div className="h-[1px] bg-white/5 my-1" />
                  <button
                    onClick={() => { handleInitiateLogout(); setShowHeaderMenu(false); }}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-all text-sm w-full text-right font-bold"
                  >
                    <LogOut size={16} />
                    <span>تسجيل الخروج</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Rooms selector button in header */}
          <button
            onClick={() => {
              toggleDropdown("rooms" as any);
              if (window.innerWidth < 768) {
                setMobileTab("members");
              }
              if (isSidebarOpen && activeSidebarTab === "rooms") {
                setIsSidebarOpen(false);
              } else {
                setIsSidebarOpen(true);
                setActiveSidebarTab("rooms");
              }
            }}
            className={\`sidebar-toggle-btn w-9 h-9 flex items-center justify-center rounded-xl border transition-all cursor-pointer flex-shrink-0 \${isSidebarOpen && activeSidebarTab === "rooms" ? "bg-green-500/10 border-green-500/20 text-green-400" : "border-transparent hover:border-green-500/10 hover:bg-white/5 text-gray-300 hover:text-white"}\`}
            title="كل الغرف"
          >
            <span className="text-xl">🏠</span>
          </button>

          {/* Members selector button in header */}
          <button
            onClick={() => {
              toggleDropdown("members" as any);
              if (window.innerWidth < 768) {
                setMobileTab("members");
              }
              if (isSidebarOpen && activeSidebarTab === "members") {
                setIsSidebarOpen(false);
              } else {
                setIsSidebarOpen(true);
                setActiveSidebarTab("members");
              }
            }}
            className={\`sidebar-toggle-btn w-9 h-9 flex items-center justify-center rounded-xl border transition-all relative cursor-pointer flex-shrink-0 \${isSidebarOpen && activeSidebarTab === "members" ? "bg-green-500/10 border-green-500/20 text-green-400" : "border-transparent hover:border-green-500/10 hover:bg-white/5 text-gray-300 hover:text-white"}\`}
            title="المتصلون (128)"
          >
            <Users size={16} />
            <span className="absolute top-1 right-1 bg-green-500 w-2 h-2 rounded-full border border-black animate-pulse"></span>
          </button>`;

if (content.includes(target)) {
  fs.writeFileSync('src/components/ChatScreen.tsx', content.replace(target, replacement));
  console.log('Fixed successfully');
} else {
  console.log('Target not found in file');
}
