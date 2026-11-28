import { useId, type SVGAttributes } from 'react';

export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    const uid = useId().replace(/:/g, '');
    const goldId = `nhn-gold-${uid}`;
    const bgId = `nhn-bg-${uid}`;

    return (
        <svg
            {...props}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            <defs>
                <linearGradient
                    id={goldId}
                    x1="8"
                    y1="6"
                    x2="94"
                    y2="94"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop offset="0%" stopColor="#FCE79C" />
                    <stop offset="32%" stopColor="#DDA93E" />
                    <stop offset="65%" stopColor="#F4DC86" />
                    <stop offset="100%" stopColor="#B8821E" />
                </linearGradient>
                <linearGradient
                    id={bgId}
                    x1="0"
                    y1="0"
                    x2="100"
                    y2="100"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop offset="0%" stopColor="#171410" />
                    <stop offset="100%" stopColor="#090806" />
                </linearGradient>
            </defs>

            {/* Obsidian square plate with metallic gold border */}
            <rect
                x="2"
                y="2"
                width="96"
                height="96"
                fill={`url(#${bgId})`}
                stroke={`url(#${goldId})`}
                strokeWidth="4"
            />

            {/* Wide center serif H */}
            <g fill={`url(#${goldId})`}>
                {/* Left vertical stem + top & bottom serifs */}
                <rect x="23" y="36" width="5.5" height="28" />
                <rect x="17.5" y="35" width="14.5" height="3" rx="0.8" />
                <rect x="17.5" y="62" width="14.5" height="3" rx="0.8" />

                {/* Right vertical stem + top & bottom serifs */}
                <rect x="71.5" y="36" width="5.5" height="28" />
                <rect x="68" y="35" width="14.5" height="3" rx="0.8" />
                <rect x="68" y="62" width="14.5" height="3" rx="0.8" />

                {/* Center horizontal crossbar */}
                <rect x="26" y="48.2" width="48" height="3.6" />
            </g>

            {/* Top serif N */}
            <g fill={`url(#${goldId})`}>
                <rect x="38.5" y="13.5" width="3.8" height="30.5" />
                <rect x="35.5" y="12.5" width="7.5" height="2.8" rx="0.6" />
                <rect x="35.5" y="41.2" width="9.8" height="2.8" rx="0.6" />
                <polygon points="39.5,12.5 43.8,12.5 61.5,44 57.5,44" />
                <rect x="57.7" y="13.5" width="3.8" height="30.5" />
                <rect x="54.7" y="12.5" width="9.8" height="2.8" rx="0.6" />
            </g>

            {/* Bottom serif N */}
            <g fill={`url(#${goldId})`}>
                <rect x="38.5" y="57" width="3.8" height="30.5" />
                <rect x="35.5" y="56" width="7.5" height="2.8" rx="0.6" />
                <rect x="35.5" y="84.7" width="9.8" height="2.8" rx="0.6" />
                <polygon points="39.5,56 43.8,56 61.5,87.5 57.5,87.5" />
                <rect x="57.7" y="57" width="3.8" height="30.5" />
                <rect x="54.7" y="56" width="9.8" height="2.8" rx="0.6" />
            </g>
        </svg>
    );
}
