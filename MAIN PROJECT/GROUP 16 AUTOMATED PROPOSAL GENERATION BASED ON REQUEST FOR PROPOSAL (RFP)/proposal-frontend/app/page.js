import { Suspense } from 'react';
import DocumentUpload from '@/components/DocumentUpload';
import './globals.css';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12">
      <Suspense fallback={<div style={{padding:'48px', textAlign:'center', color:'#8a9aaa'}}>Loading...</div>}>
        <DocumentUpload />
      </Suspense>
    </main>
  );
}