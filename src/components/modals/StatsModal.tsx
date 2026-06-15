import React from 'react';

export const StatsModal = ({ chatMembers, roomMessages, activeRoomId, openRooms, bannedUsersList }: any) => {
  return (
    <>
                  <div className="space-y-4 select-none" dir="rtl">
                    <div className="p-4 rounded-2xl lamma-section-card">
                      <div className="text-white text-xs font-black">
                        📊 الإحصائيات
                      </div>
                      <div className="text-[10px] text-gray-400 font-bold mt-1">
                        نظرة سريعة على النشاط العام داخل الشات.
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                      <div className="p-3 rounded-xl text-center lamma-stat-card">
                        <div className="text-sm font-black text-blue-300">
                          {
                            chatMembers.filter((m) => m.status === "online")
                              .length
                          }
                        </div>
                        <div className="text-[8.5px] text-gray-400 font-extrabold">
                          المتصلين الآن
                        </div>
                      </div>
                      <div className="p-3 rounded-xl text-center lamma-stat-card">
                        <div className="text-sm font-black text-emerald-400">
                          {(roomMessages?.[activeRoomId] || []).length}
                        </div>
                        <div className="text-[8.5px] text-gray-400 font-extrabold">
                          رسائل الغرفة الحالية
                        </div>
                      </div>
                      <div className="p-3 rounded-xl text-center lamma-stat-card">
                        <div className="text-sm font-black text-yellow-500">
                          {openRooms.length}
                        </div>
                        <div className="text-[8.5px] text-gray-400 font-extrabold">
                          الغرف المفتوحة
                        </div>
                      </div>
                      <div className="p-3 rounded-xl text-center lamma-stat-card">
                        <div className="text-sm font-black text-red-400">
                          {bannedUsersList.length}
                        </div>
                        <div className="text-[8.5px] text-gray-400 font-extrabold">
                          العقوبات/الحظر
                        </div>
                      </div>
                    </div>
                  </div>
    </>
  );
};
