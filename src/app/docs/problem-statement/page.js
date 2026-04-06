"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ArrowLeft, AlertTriangle, Zap, Shield, Info, AlertCircle, Satellite, Compass, Radio, Activity, ArrowRight } from "lucide-react";

export default function ProblemStatement() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <Navbar />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back button */}
        <Link 
          href="/" 
          className="inline-flex items-center text-sm text-gray-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Home
        </Link>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
            Understanding Coronal Mass Ejections (CMEs)
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Learn about the impact of CMEs on Earth&apos;s technology and infrastructure
          </p>
        </div>

        {/* YouTube Video */}
        <div className="mb-16 max-w-4xl mx-auto">
          <div className="relative overflow-hidden rounded-xl shadow-2xl" style={{ paddingBottom: '56.25%' }}>
            <iframe
              className="absolute top-0 left-0 w-full h-full"
              src="https://www.youtube.com/embed/oHHSSJDJ4oo"
              title="Understanding Coronal Mass Ejections"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        </div>

        {/* CME Information */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {/* What are CMEs? */}
          <div className="bg-slate-800/50 backdrop-blur-md rounded-xl p-6 border border-slate-700/50">
            <div className="flex items-center mb-4">
              <Info className="w-6 h-6 text-blue-400 mr-2" />
              <h2 className="text-2xl font-bold">What are CMEs?</h2>
            </div>
            <p className="text-gray-300 mb-4">
              Coronal Mass Ejections (CMEs) are massive bursts of solar wind and magnetic fields rising above the solar corona or being released into space. These solar storms can eject billions of tons of coronal material and carry an embedded magnetic field.
            </p>
            <p className="text-gray-300">
              CMEs travel outward from the Sun at speeds ranging from 250 km/s to 3000 km/s. The fastest CMEs can reach Earth in as little as 15-18 hours, while slower ones can take several days to arrive.
            </p>
          </div>

          {/* Impacts on Earth */}
          <div className="bg-slate-800/50 backdrop-blur-md rounded-xl p-6 border border-slate-700/50">
            <div className="flex items-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-400 mr-2" />
              <h2 className="text-2xl font-bold">Impacts on Earth</h2>
            </div>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-start">
                <Zap className="w-5 h-5 text-yellow-400 mt-0.5 mr-2 flex-shrink-0" />
                <span><strong>Power Grids:</strong> Can cause voltage instability and blackouts</span>
              </li>
              <li className="flex items-start">
                <Satellite className="w-5 h-5 text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
                <span><strong>Satellites:</strong> May experience damage or disruption to operations</span>
              </li>
              <li className="flex items-start">
                <Compass className="w-5 h-5 text-purple-400 mt-0.5 mr-2 flex-shrink-0" />
                <span><strong>Navigation:</strong> GPS and other navigation systems can be affected</span>
              </li>
              <li className="flex items-start">
                <Radio className="w-5 h-5 text-green-400 mt-0.5 mr-2 flex-shrink-0" />
                <span><strong>Radio Communication:</strong> Can cause radio blackouts</span>
              </li>
            </ul>
          </div>
        </div>

        {/* CME Categories */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold mb-6">CME Severity Categories</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Critical */}
            <div className="bg-gradient-to-br from-red-900/40 to-red-800/20 backdrop-blur-md rounded-xl p-6 border border-red-500/30">
              <div className="flex items-center mb-3">
                <AlertTriangle className="w-6 h-6 text-red-400 mr-2" />
                <h3 className="text-xl font-semibold">Critical</h3>
              </div>
              <p className="text-gray-300 mb-4">Extreme geomagnetic storms with widespread voltage control problems. Complete blackout of HF radio communication possible.</p>
              <div className="text-sm text-red-300">
                <p>• Kp Index: 9</p>
                <p>• G-Scale: G5 (Extreme)</p>
              </div>
            </div>

            {/* High */}
            <div className="bg-gradient-to-br from-orange-900/40 to-orange-800/20 backdrop-blur-md rounded-xl p-6 border border-orange-500/30">
              <div className="flex items-center mb-3">
                <Zap className="w-5 h-5 text-orange-400 mr-2" />
                <h3 className="text-xl font-semibold">High</h3>
              </div>
              <p className="text-gray-300 mb-4">Strong geomagnetic storms that may cause power grid fluctuations and affect satellite operations.</p>
              <div className="text-sm text-orange-300">
                <p>• Kp Index: 7-8</p>
                <p>• G-Scale: G3-G4 (Strong to Severe)</p>
              </div>
            </div>

            {/* Medium */}
            <div className="bg-gradient-to-br from-yellow-900/40 to-yellow-800/20 backdrop-blur-md rounded-xl p-6 border border-yellow-500/30">
              <div className="flex items-center mb-3">
                <Shield className="w-5 h-5 text-yellow-400 mr-2" />
                <h3 className="text-xl font-semibold">Medium</h3>
              </div>
              <p className="text-gray-300 mb-4">Moderate geomagnetic storms that may cause intermittent satellite navigation and low-frequency radio navigation problems.</p>
              <div className="text-sm text-yellow-300">
                <p>• Kp Index: 5-6</p>
                <p>• G-Scale: G1-G2 (Minor to Moderate)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Monitoring and Protection */}
        <div className="bg-slate-800/50 backdrop-blur-md rounded-xl p-8 border border-slate-700/50 mb-16">
          <h2 className="text-3xl font-bold mb-6">Monitoring & Protection</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold mb-3 text-orange-400">How We Monitor CMEs</h3>
              <ul className="space-y-3 text-gray-300">
                <li>• Real-time data from Aditya-L1&apos;s ASPEX & SUIT instruments</li>
                <li>• Ground-based solar observatories</li>
                <li>• Space weather monitoring satellites</li>
                <li>• Magnetometer networks around the globe</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-3 text-green-400">Protection Measures</h3>
              <ul className="space-y-3 text-gray-300">
                <li>• Power grid operators can take protective actions</li>
                <li>• Satellite operators can put systems in safe mode</li>
                <li>• Airlines may reroute flights from polar regions</li>
                <li>• Critical infrastructure can implement surge protection</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center bg-gradient-to-r from-orange-500/10 to-red-500/10 backdrop-blur-sm rounded-xl p-8 border border-orange-500/20">
          <h3 className="text-2xl font-bold mb-4">Stay Protected with Real-time Alerts</h3>
          <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
            Our advanced monitoring system provides early warnings and detailed forecasts to help you prepare for and mitigate the effects of CMEs.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-red-600 transition-all duration-200"
          >
            <Activity className="w-5 h-5 mr-2" />
            Go to Live Dashboard
            <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
