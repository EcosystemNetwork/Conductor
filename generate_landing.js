const fs = require('fs');

const htmlContent = fs.readFileSync('index.html', 'utf-8');

const styleMatch = htmlContent.match(/<style>([\s\S]*?)<\/style>/);
const css = styleMatch ? styleMatch[1] : '';

const scriptMatch = htmlContent.match(/<script>([\s\S]*?)<\/script>/);
const js = scriptMatch ? scriptMatch[1] : '';

let bodyMatch = htmlContent.match(/<body>([\s\S]*?)<script>/);
let bodyHtml = bodyMatch ? bodyMatch[1] : '';

// Replace links
bodyHtml = bodyHtml.replace(
    '<a href="https://github.com/EcosystemNetwork/Conductor" class="btn-glow" target="_blank">View on GitHub</a>',
    '<a href="/dashboard" class="btn-glow">Launch Dashboard</a>'
);
bodyHtml = bodyHtml.replace(
    '<a href="#api" class="btn-hero btn-hero-primary">',
    '<a href="/dashboard" class="btn-hero btn-hero-primary">'
);

// We only escape CSS and Body because they are injected inside template literals in the generated TSX.
const escapedCSS = css.replace(/`/g, '\\`').replace(/\$/g, '\\$');
const escapedBody = bodyHtml.replace(/`/g, '\\`').replace(/\$/g, '\\$');

// JS is injected verbatim.
const escapedJS = js;

const pageTsx = `"use client";

import { useEffect, useRef } from 'react';
import Head from 'next/head';

export default function LandingPage() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        try {
            // Run the script
            ${escapedJS}
        } catch (e) {
            console.error("Landing page script error:", e);
        }
        
        return () => {};
    }, []);

    return (
        <div ref={containerRef} className="landing-page-wrapper">
             <style dangerouslySetInnerHTML={{__html: \`
                ${escapedCSS}
                /* override body since we cant apply to body */
                .landing-page-wrapper {
                   background: var(--dark);
                   color: var(--light);
                   font-family: 'Outfit', sans-serif;
                   line-height: 1.65;
                   overflow-x: hidden;
                   min-height: 100vh;
                   position: relative;
                }
             \`}} />
             
             <div dangerouslySetInnerHTML={{__html: \`
                ${escapedBody}
             \`}} />
        </div>
    );
}
`;

fs.writeFileSync('app/page.tsx', pageTsx);

// Let's also fix the dashboard page while we're here!
const dashboardPath = 'app/dashboard/page.tsx';
let dashboardContent = fs.readFileSync(dashboardPath, 'utf-8');
dashboardContent = dashboardContent.replace("'../components/WalletConnect'", "'../../components/WalletConnect'");
dashboardContent = dashboardContent.replace("'../lib/store'", "'../../lib/store'");
fs.writeFileSync(dashboardPath, dashboardContent);

console.log("Fixed files successfully.");
