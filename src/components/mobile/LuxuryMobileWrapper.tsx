import React, { useState } from "react";
import { LuxuryDMList } from "./LuxuryDMList";
import { LuxuryDMChat } from "./LuxuryDMChat";
import { LuxuryIncomingCallModal } from "./LuxuryIncomingCallModal";

interface LuxuryMobileWrapperProps {
  currentUser: any;
  initiateCall: (nickname: string, type: "audio" | "video") => void;
  incomingCall: any;
  acceptIncoming: () => void;
  rejectIncoming: () => void;
}

export function LuxuryMobileWrapper({
  currentUser,
  initiateCall,
  incomingCall,
  acceptIncoming,
  rejectIncoming,
}: LuxuryMobileWrapperProps) {
  const [showDmList, setShowDmList] = useState(false);
  const [showDmChat, setShowDmChat] = useState(false);
  const [selectedDmContact, setSelectedDmContact] = useState<any>(null);
  const [showIncomingCallModal, setShowIncomingCallModal] = useState(false);
  const [incomingCallInfo, setIncomingCallInfo] = useState<any>(null);

  const handleDmAudioCall = (contactId: string) => {
    initiateCall(currentUser.nickname, "audio");
    setShowDmChat(false);
  };

  const handleDmVideoCall = (contactId: string) => {
    initiateCall(currentUser.nickname, "video");
    setShowDmChat(false);
  };

  const handleOpenDmList = () => setShowDmList(true);
  const handleCloseDmList = () => setShowDmList(false);

  const handleOpenDmChat = (contact: any) => {
    setSelectedDmContact(contact);
    setShowDmChat(true);
    setShowDmList(false);
  };

  const handleCloseDmChat = () => {
    setShowDmChat(false);
    setSelectedDmContact(null);
  };

  const sampleDmContacts = [
    {
      id: "1",
      name: "أحمد محمد",
      avatar: "أ",
      lastMessage: "مرحباً! كيف حالك؟",
      time: "10:30",
      online: true,
    },
    {
      id: "2",
      name: "سارة علي",
      avatar: "س",
      lastMessage: "شكراً لك",
      time: "09:45",
      online: false,
    },
  ];

  return (
    <>
      <LuxuryDMList
        isOpen={showDmList}
        onClose={handleCloseDmList}
        onOpenChat={handleOpenDmChat}
        contacts={sampleDmContacts}
        currentUser={currentUser}
      />
      <LuxuryDMChat
        isOpen={showDmChat}
        onClose={handleCloseDmChat}
        contact={selectedDmContact}
        currentUser={currentUser}
        onCallAudio={handleDmAudioCall}
        onCallVideo={handleDmVideoCall}
      />
      <LuxuryIncomingCallModal
        isOpen={showIncomingCallModal}
        caller={incomingCallInfo || { name: "مستخدم", avatar: "م", callType: "audio" }}
        onAccept={() => {
          setShowIncomingCallModal(false);
          if (incomingCall) acceptIncoming();
        }}
        onReject={() => {
          setShowIncomingCallModal(false);
          if (incomingCall) rejectIncoming();
        }}
      />
    </>
  );
}
