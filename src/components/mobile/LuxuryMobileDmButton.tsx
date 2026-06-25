import React, { useState } from "react";
import { MessageSquare } from "lucide-react";

interface LuxuryMobileDmButtonProps {
  currentUser: any;
}

export function LuxuryMobileDmButton({ currentUser }: LuxuryMobileDmButtonProps) {
  const [showDialog, setShowDialog] = useState(false);

  return (
    <>
      {/* DM Button - Fixed Position */}
      <button
        onClick={() => setShowDialog(true)}
        style={{
          position: "fixed",
          bottom: "100px",
          right: "20px",
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          backgroundColor: "rgba(34, 197, 94, 0.9)",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
          zIndex: 9999,
        }}
      >
        <MessageSquare size={24} color="white" strokeWidth={2} />
      </button>

      {/* Simple Dialog */}
      {showDialog && (
        <div
          onClick={() => setShowDialog(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            zIndex: 10000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "480px",
              backgroundColor: "#1a1a2e",
              borderRadius: "20px 20px 0 0",
              padding: "20px",
              maxHeight: "80vh",
              overflowY: "auto",
            }}
          >
            <div style={{ color: "white", fontSize: "20px", fontWeight: "bold", marginBottom: "20px" }}>
              الرسائل الخاصة
            </div>
            <div style={{ color: "#888", textAlign: "center", padding: "40px 20px" }}>
              قائمة الرسائل الخاصة قيد التطوير
            </div>
            <button
              onClick={() => setShowDialog(false)}
              style={{
                width: "100%",
                padding: "12px",
                backgroundColor: "#22c55e",
                color: "white",
                border: "none",
                borderRadius: "10px",
                fontSize: "16px",
                cursor: "pointer",
                marginTop: "20px",
              }}
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </>
  );
}
