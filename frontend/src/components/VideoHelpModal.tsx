// frontend/src/components/VideoHelpModal.tsx
import React from "react";
import Modal from "./Modal";
import { X } from "lucide-react";

interface VideoHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: string;
  title: string;
}

const VideoHelpModal: React.FC<VideoHelpModalProps> = ({
  isOpen,
  onClose,
  videoId,
  title,
}) => {
  if (!isOpen) return null;

  // Construct the YouTube embed URL
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="xl">
      <div className="relative h-0 pb-[56.25%]">
        <iframe
          src={embedUrl}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={title}
          className="absolute top-0 left-0 w-full h-full rounded-lg"
        ></iframe>
      </div>
    </Modal>
  );
};

export default VideoHelpModal;
