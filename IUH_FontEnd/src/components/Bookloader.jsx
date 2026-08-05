import React from "react";
import logo from "../assets/logo_1.svg";

export default function BookLoader({
  size = 1,
  colorOuter = "#002190",
  colorInner = "#FFFFFF",
}) {
  // Tính toán --size dựa trên prop size truyền vào
  const baseSize = 1 * size;

  return (
    <>
      <style>{`
        .loader {
          --color-1: ${colorOuter};
          --color-2: ${colorInner};
          --size: ${baseSize}px;

          width: calc(48 * var(--size));
          height: calc(48 * var(--size));
          border: calc(3 * var(--size)) solid var(--color-1);
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          position: relative;
          box-sizing: border-box;
          animation: rotation 1s linear infinite;
        }

        .loader::after {
          content: '';
          box-sizing: border-box;
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: calc(40 * var(--size));
          height: calc(40 * var(--size));
          border-radius: 50%;
          border: calc(3 * var(--size)) solid;
          border-color: var(--color-2) transparent;
        }

        .book-loader-logo {
          position: absolute;
          width: 45%;
          height: 45%;
          object-fit: contain;
          z-index: 10;
          user-select: none;
          pointer-events: none;
          /* Hủy xoay cho logo nếu muốn logo đứng yên */
          animation: counter-rotation 1s linear infinite;
        }

        @keyframes rotation {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes counter-rotation {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(-360deg);
          }
        }
      `}</style>

      <div className="loader">
        {/* Logo giữ ở trung tâm */}
        <img
          src={logo}
          alt="Logo"
          className="book-loader-logo"
          draggable={false}
        />
      </div>
    </>
  );
}