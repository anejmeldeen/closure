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
      <div className="flex flex-col gap-4">
        <div className="border-2 border-[#2D2A26] bg-[#86efac] p-6 shadow-brutal">
          <div className="flex items-center gap-3">
            <Check size={24} strokeWidth={3} className="text-[#2D2A26]" />
            <h3 className="font-black text-lg uppercase text-[#2D2A26]">
              Premium Active
            </h3>
          </div>
        </div>
        <button
          onClick={handleDisablePremium}
          className="px-6 py-3 bg-red-600 text-white border-2 border-[#2D2A26] font-black uppercase text-sm shadow-brutal hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
        >
          Disable Premium
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {!connected ? (
        <>
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="w-full px-6 py-3 bg-[#2D2A26] text-white border-2 border-[#2D2A26] font-black uppercase text-sm shadow-brutal hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 disabled:opacity-50 transition-all"
          >
            {connecting ? "Connecting..." : "Connect Phantom Wallet"}
          </button>

          <button
            onClick={() => {
              localStorage.setItem("capacity_premium", "true");
              onPaymentSuccess();
            }}
            className="w-full px-6 py-3 bg-[#ffbb00] text-[#2D2A26] border-2 border-[#2D2A26] font-black uppercase text-sm shadow-brutal hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
          >
            Test Demo (No Payment)
          </button>
        </>
      ) : (
        <>
          <div className="border-2 border-[#2D2A26] bg-[#f5f2e8] p-6 shadow-brutal">
            <h4 className="font-black uppercase text-xs tracking-widest text-[#2D2A26] mb-4">
              Wallet Connected
            </h4>
            <div className="flex items-center justify-between gap-2 bg-white p-3 border-2 border-[#2D2A26] shadow-brutal-sm">
              <code className="text-xs font-mono text-[#2D2A26] font-bold">
                {publicKey?.toString().slice(0, 16)}...
              </code>
              <button
                onClick={copyAddress}
                className="p-2 hover:bg-[#2D2A26] hover:text-white transition-all"
                title="Copy address"
              >
                {copied ? (
                  <Check size={16} className="text-[#2D2A26]" strokeWidth={3} />
                ) : (
                  <Copy size={16} className="text-[#2D2A26]" />
                )}
              </button>
            </div>
          </div>
          <button
            onClick={handlePayment}
            disabled={loading}
            className="w-full px-6 py-3 bg-[#86efac] text-[#2D2A26] border-2 border-[#2D2A26] font-black uppercase text-sm shadow-brutal hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 disabled:opacity-50 transition-all"
          >
            {loading
              ? "Processing..."
              : `Pay ${PREMIUM_PRICE_SOL} SOL for Premium`}
          </button>
        </>
      )}
      {error && (
        <div className="border-2 border-red-600 bg-red-100 p-4 shadow-brutal">
          <p className="text-red-700 text-xs font-black uppercase">
            Error: {error}
          </p>
        </div>
      )}
    </div>
  );
}
