import React, { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export interface WebcamProps extends React.HTMLAttributes<HTMLDivElement> {
  onCapture?: (imageSrc: string) => void;
  autoStart?: boolean;
  width?: number;
  height?: number;
  facingMode?: "user" | "environment";
}

export const Webcam = React.forwardRef<HTMLDivElement, WebcamProps>(
  (
    {
      className,
      onCapture,
      autoStart = false,
      width = 640,
      height = 480,
      facingMode = "user",
      ...props
    },
    ref
  ) => {
    const [isStreaming, setIsStreaming] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const startStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width,
            height,
            facingMode,
          },
          audio: false,
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsStreaming(true);
        }
      } catch (error) {
        console.error("Error accessing webcam:", error);
      }
    };

    const stopStream = () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
        videoRef.current.srcObject = null;
        setIsStreaming(false);
      }
    };

    const captureImage = () => {
      if (videoRef.current && canvasRef.current) {
        const context = canvasRef.current.getContext("2d");
        if (context) {
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
          context.drawImage(
            videoRef.current,
            0,
            0,
            videoRef.current.videoWidth,
            videoRef.current.videoHeight
          );
          const imageSrc = canvasRef.current.toDataURL("image/png");
          if (onCapture) {
            onCapture(imageSrc);
          }
          return imageSrc;
        }
      }
      return null;
    };

    useEffect(() => {
      if (autoStart) {
        startStream();
      }
      
      return () => {
        stopStream();
      };
    }, [autoStart]);

    return (
      <div className={cn("relative", className)} {...props} ref={ref}>
        <video
          ref={videoRef}
          className="w-full h-full rounded-md"
          autoPlay
          playsInline
          muted
        />
        <canvas ref={canvasRef} className="hidden" />
        <div className="flex gap-2 justify-center mt-4">
          {!isStreaming && (
            <button
              type="button"
              className="bg-primary hover:bg-primary-dark text-white py-2 px-4 rounded-md text-sm"
              onClick={startStream}
            >
              Start Camera
            </button>
          )}
          {isStreaming && (
            <>
              <button
                type="button"
                className="bg-primary hover:bg-primary-dark text-white py-2 px-4 rounded-md text-sm"
                onClick={captureImage}
              >
                Capture
              </button>
              <button
                type="button"
                className="bg-neutral-200 hover:bg-neutral-300 text-neutral-700 py-2 px-4 rounded-md text-sm"
                onClick={stopStream}
              >
                Stop Camera
              </button>
            </>
          )}
        </div>
      </div>
    );
  }
);

Webcam.displayName = "Webcam";

export default Webcam;
