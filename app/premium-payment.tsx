"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { useState } from "react";
import { CheckCircle, Copy, Check } from "lucide-react";

const PREMIUM_PRICE_SOL = 0.01;
const PREMIUM_RECIPIENT = new PublicKey("11111111111111111111111111111111");

export function PremiumPaymentFlow({
  onPaymentSuccess,
  isPremium,
}: {
  onPaymentSuccess: () => void;
  isPremium: boolean;
}) {
  const { connection } = useConnection();
  const {
    publicKey,
    sendTransaction,
    connected,
    connecting,
    wallet,
    select,
    wallets,
  } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConnect = async () => {
    try {
      setError(null);

      // First check if wallet is selected
      if (!wallet) {
        // Find and select Phantom wallet
        const phantomWallet = wallets?.find(
          (w) => w.adapter.name === "Phantom",
        );
        if (phantomWallet && select) {
          select(phantomWallet.adapter.name);
          return;
        }
        setError("Phantom wallet not found. Please install it.");
        return;
      }

      // Connect using the wallet adapter
      if (wallet.adapter.connected) {
        return; // Already connected
      }

      await wallet.adapter.connect();
    } catch (err) {
      const error = err as Error & { message?: string };
      console.error("Connect error:", error);
      if (error?.message?.includes("rejected")) {
        setError("You rejected the connection");
      } else if (error?.message?.includes("popup")) {
        setError("Wallet popup was blocked. Please allow popups.");
      } else {
        setError("Connection failed: " + (error?.message || "Unknown error"));
      }
    }
  };

  const handlePayment = async () => {
    if (!publicKey || !connected) {
      setError("Please connect your wallet first");
      return;
    }

    if (!wallet?.adapter) {
      setError("Wallet not properly connected. Please reconnect.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: PREMIUM_RECIPIENT,
          lamports: PREMIUM_PRICE_SOL * LAMPORTS_PER_SOL,
        }),
      );

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      console.log("Sending transaction...");
      const signature = await sendTransaction(transaction, connection);
      console.log("Transaction sent, signature:", signature);

      console.log("Confirming transaction...");
      await connection.confirmTransaction(signature, "confirmed");
      console.log("Transaction confirmed!");

      localStorage.setItem("capacity_premium", "true");
      onPaymentSuccess();
    } catch (err) {
      const error = err as Error & { message?: string };
      console.error("Payment error:", error);
      if (error?.message?.includes("rejected")) {
        setError("You rejected the transaction in your wallet");
      } else {
        setError("Payment failed: " + (error?.message || "Unknown error"));
      }
    } finally {
      setLoading(false);
    }
  };

  if (isPremium) {
    const handleDisablePremium = () => {
      localStorage.removeItem("capacity_premium");
      // Reload to reset the state
      window.location.reload();
    };

    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 text-green-700 text-sm font-semibold bg-linear-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200 shadow-sm">
          <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
            <CheckCircle size={14} className="text-white" />
          </div>
          <span>Premium Active ✓</span>
        </div>
        <button
          onClick={handleDisablePremium}
          className="px-4 py-2 text-sm bg-linear-to-r from-red-500 to-red-600 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-red-500/30 transition-all duration-200 hover:scale-105"
        >
          Disable Premium
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      {!connected ? (
        <>
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="w-full px-4 py-3 bg-linear-to-r from-cyan-600 to-cyan-500 text-white font-semibold rounded-lg shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 hover:scale-105"
          >
            {connecting ? "Connecting..." : "🔗 Connect Phantom Wallet"}
          </button>

          <button
            onClick={() => {
              localStorage.setItem("capacity_premium", "true");
              onPaymentSuccess();
            }}
            className="w-full px-4 py-3 bg-linear-to-r from-gray-400 to-gray-500 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-gray-400/30 transition-all duration-200 hover:scale-105"
          >
            🧪 Test Demo (No Payment)
          </button>
        </>
      ) : (
        <>
          <div className="bg-linear-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 space-y-3">
            <div className="text-xs font-semibold text-green-800 flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              Wallet Connected
            </div>
            <div className="flex items-center justify-between gap-2 bg-white p-3 rounded-lg border border-green-200 shadow-sm">
              <code className="text-xs font-mono text-gray-700 font-semibold">
                {publicKey?.toString().slice(0, 16)}...
              </code>
              <button
                onClick={copyAddress}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                title="Copy address"
              >
                {copied ? (
                  <Check size={16} className="text-green-600 font-bold" />
                ) : (
                  <Copy size={16} className="text-gray-600" />
                )}
              </button>
            </div>
          </div>
          <button
            onClick={handlePayment}
            disabled={loading}
            className="w-full px-4 py-3 bg-linear-to-r from-cyan-600 to-cyan-500 text-white font-semibold rounded-lg shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/40 transition-all duration-200 disabled:opacity-50 hover:scale-105"
          >
            {loading
              ? "⏳ Processing payment..."
              : `💳 Pay ${PREMIUM_PRICE_SOL} SOL for Premium`}
          </button>
        </>
      )}
      {error && (
        <span className="text-red-700 text-sm font-semibold text-center bg-red-50 p-3 rounded-lg border border-red-200">
          ⚠️ {error}
        </span>
      )}
    </div>
  );
}
