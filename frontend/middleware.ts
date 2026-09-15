import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Secret key from environment (must match backend SECRET_KEY)
const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || '09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7'
);

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('visioninspect_auth_token')?.value;
  const { pathname } = request.nextUrl;

  const isProtectedRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/inspect') || pathname.startsWith('/profile') || pathname.startsWith('/settings');
  
  let role = null;
  let isAuthenticated = false;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, SECRET_KEY);
      role = payload.role as string;
      isAuthenticated = true;
    } catch (error) {
      // Token is expired or invalid
      console.error("JWT Verification failed:", error);
    }
  }

  if (isProtectedRoute) {
    if (!isAuthenticated) {
      // Redirect to login if not authenticated or token invalid
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Handle role-based redirection for the root /dashboard path
    if (pathname === '/dashboard') {
      if (role === 'QUALITY_ENGINEER') {
        return NextResponse.redirect(new URL('/dashboard/engineer', request.url));
      } else if (role === 'FACTORY_SUPERVISOR') {
        return NextResponse.redirect(new URL('/dashboard/supervisor', request.url));
      } else if (role === 'ADMIN') {
        return NextResponse.redirect(new URL('/dashboard/admin', request.url));
      }
    }
    
    // Strict Role Enforcement
    if (pathname.startsWith('/dashboard/engineer') && role !== 'QUALITY_ENGINEER') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    if (pathname.startsWith('/dashboard/supervisor') && role !== 'FACTORY_SUPERVISOR') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    if (pathname.startsWith('/dashboard/admin') && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // If trying to access login or register while already authenticated
  if ((pathname === '/login' || pathname === '/register' || pathname === '/forgot-password') && isAuthenticated) {
    if (role === 'QUALITY_ENGINEER') {
      return NextResponse.redirect(new URL('/dashboard/engineer', request.url));
    } else if (role === 'FACTORY_SUPERVISOR') {
      return NextResponse.redirect(new URL('/dashboard/supervisor', request.url));
    } else if (role === 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard/admin', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/inspect/:path*', '/login', '/register', '/forgot-password', '/profile', '/settings'],
};
