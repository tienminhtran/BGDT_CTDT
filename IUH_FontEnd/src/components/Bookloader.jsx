import React from "react";
import logo from "../assets/logo_1.svg";

export default function BookLoader({
  size = 1,
  colorOuter = "#2b72c4",
  colorInner = "#4a1575",
}) {
  const px = 80 * size;

  return (
    <>
      <style>{`
        .book-loader{
          position:relative;
          display:inline-flex;
          align-items:center;
          justify-content:center;
        }

        .book-loader svg{
          width:100%;
          height:100%;
        }

        .book-loader-logo{
          position:absolute;
          width:38%;
          height:38%;
          object-fit:contain;
          z-index:10;
          user-select:none;
          pointer-events:none;
        }

        .outer-ring{
          animation:spinClockwise 2s linear infinite;
          transform-origin:center;
        }

        .inner-ring{
          animation:spinCounterClockwise 1.5s linear infinite;
          transform-origin:center;
        }

        @keyframes spinClockwise{
          from{
            transform:rotate(0deg);
          }
          to{
            transform:rotate(360deg);
          }
        }

        @keyframes spinCounterClockwise{
          from{
            transform:rotate(0deg);
          }
          to{
            transform:rotate(-360deg);
          }
        }
      `}</style>

      <div
        className="book-loader"
        style={{
          width: px,
          height: px,
        }}
      >
        <svg viewBox="0 0 100 100">
          {/* Vòng ngoài */}
          <g className="outer-ring">
            <path
              d="M20 50 A30 30 0 0 1 80 50"
              fill="none"
              stroke={colorOuter}
              strokeWidth="7"
              strokeLinecap="round"
            />
          </g>

          {/* Vòng trong */}
          <g className="inner-ring">
            <path
              d="M50 28 A22 22 0 0 1 50 72"
              fill="none"
              stroke={colorInner}
              strokeWidth="7"
              strokeLinecap="round"
            />
          </g>
        </svg>

        {/* Logo giữa */}
        <img
          src={logo}
          alt="Logo"
          className="book-loader-logo size-logo"
          draggable={false}
        />
      </div>
    </>
  );
}