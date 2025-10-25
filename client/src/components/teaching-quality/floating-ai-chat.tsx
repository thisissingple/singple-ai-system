/**
 * Floating AI Chat Component
 *
 * A floating chat window positioned at bottom-right corner
 * 右下角浮動 AI 策略助手對話視窗
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, X } from 'lucide-react';
import { AIChatBox } from './ai-chat-box';

interface FloatingAIChatProps {
  studentEmail: string;
  studentName: string;
  totalClasses: number;
  totalConsultations: number;
}

export function FloatingAIChat({
  studentEmail,
  studentName,
  totalClasses,
  totalConsultations,
}: FloatingAIChatProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* 圓形按鈕（始終顯示） */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        size="lg"
        className="h-14 w-14 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg transition-all hover:scale-110 hover:shadow-xl"
        title={isOpen ? '關閉 AI 策略助手' : '打開 AI 策略助手'}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageSquare className="h-6 w-6" />
        )}
      </Button>
      {!isOpen && (
        <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
          AI
        </div>
      )}

      {/* 對話視窗（打開時顯示在按鈕上方） */}
      {isOpen && (
        <div className="absolute bottom-20 right-0 w-[400px] animate-in slide-in-from-bottom-4 fade-in duration-200">
          <Card className="flex h-[600px] flex-col shadow-2xl">
            {/* Header */}
            <CardHeader className="border-b bg-gradient-to-r from-purple-600 to-blue-600 p-4 text-white">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <MessageSquare className="h-5 w-5" />
                AI 策略助手
              </CardTitle>
            </CardHeader>

            {/* Content */}
            <CardContent className="flex-1 overflow-hidden p-0">
              <div className="h-full">
                <AIChatBox
                  studentEmail={studentEmail}
                  studentName={studentName}
                  totalClasses={totalClasses}
                  totalConsultations={totalConsultations}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
