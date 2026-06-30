'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { UserIcon } from '@/components/icons';
import { UserMenu } from '../user-menu';

interface AuthData {
  user: {
    name: string;
    avatar?: string | null;
    is_writer: boolean;
  } | null;
  unread: number;
}

let sharedAuthPromise: Promise<AuthData> | null = null;

function fetchSharedAuth(): Promise<AuthData> {
  if (!sharedAuthPromise) {
    sharedAuthPromise = fetch('/api/auth/me')
      .then((res) => {
        if (!res.ok) throw new Error('Not authenticated');
        return res.json();
      })
      .then((json) => {
        return {
          user: json.user ?? null,
          unread: Number(json.unread) || 0,
        };
      })
      .catch((err) => {
        sharedAuthPromise = null;
        throw err;
      });
  }
  return sharedAuthPromise;
}

export function QalahHeaderAuth() {
  const [data, setData] = useState<AuthData>({ user: null, unread: 0 });

  useEffect(() => {
    let active = true;
    fetchSharedAuth()
      .then((auth) => {
        if (active) {
          setData(auth);
        }
      })
      .catch(() => {
        // Fallback to guest state on error/unauthorized
      });

    return () => {
      active = false;
    };
  }, []);

  const { user, unread } = data;

  const notifLink = (
    <Link href={user ? '/account/notifications' : '/login'} className="header-icon-btn" aria-label="الإشعارات">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {unread > 0 && <span className="red-badge" />}
    </Link>
  );

  const authArea = user ? (
    <UserMenu name={user.name} avatar={user.avatar ?? null} isWriter={user.is_writer} unread={unread} />
  ) : (
    <Link href="/login" className="header-icon-btn" aria-label="تسجيل الدخول">
      <span className="header-user-avatar">
        <UserIcon className="size-5" aria-hidden />
      </span>
    </Link>
  );

  return (
    <>
      {notifLink}
      {authArea}
    </>
  );
}
