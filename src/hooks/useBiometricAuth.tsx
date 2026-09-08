import { useState, useEffect, useCallback } from 'react';

interface BiometricCredential {
  cpf: string;
  name?: string;
  credentialId: string;
}

const STORAGE_KEY = 'plantao_pro_biometric_credentials';

export function useBiometricAuth() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrolledCpf, setEnrolledCpf] = useState<string | null>(null);

  useEffect(() => {
    // Check if Web Authentication API is available
    const checkAvailability = async () => {
      try {
        if (window.PublicKeyCredential) {
          // Check if platform authenticator is available (Touch ID, Face ID, Windows Hello)
          const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setIsAvailable(available);
          
          // Check if already enrolled
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            const credential: BiometricCredential = JSON.parse(saved);
            setIsEnrolled(true);
            setEnrolledCpf(credential.cpf);
          }
        }
      } catch (error) {
        console.log('Biometric auth not available:', error);
        setIsAvailable(false);
      }
    };

    checkAvailability();
  }, []);

  const enrollBiometric = useCallback(async (cpf: string, name?: string): Promise<boolean> => {
    if (!isAvailable) return false;

    try {
      // Create a simple challenge
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      // Generate a unique user ID based on CPF
      const encoder = new TextEncoder();
      const userId = encoder.encode(cpf.replace(/\D/g, ''));

      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: 'PlantãoPRO',
          id: window.location.hostname,
        },
        user: {
          id: userId,
          name: cpf,
          displayName: name || cpf,
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' }, // ES256
          { alg: -257, type: 'public-key' }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'none',
      };

      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions,
      }) as PublicKeyCredential;

      if (credential) {
        // Store the credential ID
        const biometricCred: BiometricCredential = {
          cpf: cpf.replace(/\D/g, ''),
          name,
          credentialId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
        };
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(biometricCred));
        setIsEnrolled(true);
        setEnrolledCpf(cpf.replace(/\D/g, ''));
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Biometric enrollment failed:', error);
      return false;
    }
  }, [isAvailable]);

  const authenticateBiometric = useCallback(async (): Promise<string | null> => {
    if (!isAvailable || !isEnrolled) return null;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return null;

      const credential: BiometricCredential = JSON.parse(saved);
      
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      // Decode the stored credential ID
      const rawId = Uint8Array.from(atob(credential.credentialId), c => c.charCodeAt(0));

      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        timeout: 60000,
        rpId: window.location.hostname,
        allowCredentials: [{
          id: rawId,
          type: 'public-key',
          transports: ['internal'],
        }],
        userVerification: 'required',
      };

      const assertion = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
      }) as PublicKeyCredential;

      if (assertion) {
        // Biometric auth successful, return the CPF
        return credential.cpf;
      }
      
      return null;
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return null;
    }
  }, [isAvailable, isEnrolled]);

  const removeBiometric = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setIsEnrolled(false);
    setEnrolledCpf(null);
  }, []);

  return {
    isAvailable,
    isEnrolled,
    enrolledCpf,
    enrollBiometric,
    authenticateBiometric,
    removeBiometric,
  };
}