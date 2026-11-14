"use client";

import { Box, Modal } from "@mui/material";
import Image from "next/image";
import { useState } from "react";
import ModalCloseButton from "@/components/ModalCloseButton";

const style = {
  position: "absolute" as const,
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 400,
  border: "2px solid #eee",
  borderRadius: "10px",
  boxShadow: 24,
  p: 4,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
};

export default function ShowMedia(props: { media: string; mediaType: string }) {
  const [open, setOpen] = useState(false);
  function handleOpen() {
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
  }

  const mediaType = props.mediaType;

  return (
    <>
      <button
        className="p-1 ml-auto text-xs text-theme-onPrimary dark:text-theme-onPrimary bg-theme-primary dark:bg-theme-primary rounded-md"
        onClick={handleOpen}
      >
        View {mediaType === "video" ? "video" : "image"}
      </button>

      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box
          sx={style}
          className="max-w-[600px] bg-theme-background dark:bg-theme-surface"
        >
          <ModalCloseButton
            onClose={handleClose}
            className="text-theme-text dark:text-theme-text hover:bg-black/5 dark:hover:bg-theme-surface/10"
          />
          {mediaType === "video" && (
            <video src={props.media} controls playsInline className="w-full" />
          )}
          {mediaType === "image" && (
            <Image
              src={props.media}
              className="w-full h-full object-cover"
              alt="media Image"
              unoptimized
              height={200}
              width={200}
            />
          )}
        </Box>
      </Modal>
    </>
  );
}
