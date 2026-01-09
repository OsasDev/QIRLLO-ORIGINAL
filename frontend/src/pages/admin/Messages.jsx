import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import { messagesApi, usersApi } from '../../lib/api';
import { toast } from 'sonner';
import { Send, Inbox, SendHorizontal, Mail, MailOpen, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export const Messages = () => {
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [folder, setFolder] = useState('inbox');

  const [form, setForm] = useState({
    recipient_id: '',
    subject: '',
    content: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadMessages();
  }, [folder]);

  const loadData = async () => {
    try {
      const [teachersRes, parentsRes] = await Promise.all([
        usersApi.getTeachers(),
        usersApi.getParents(),
      ]);
      setUsers([...teachersRes.data, ...parentsRes.data]);
      await loadMessages();
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      const res = await messagesApi.getAll(folder);
      setMessages(res.data);
    } catch (error) {
      toast.error('Failed to load messages');
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setSending(true);

    try {
      await messagesApi.send(form);
      toast.success('Message sent successfully');
      setDialogOpen(false);
      setForm({ recipient_id: '', subject: '', content: '' });
      if (folder === 'sent') loadMessages();
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleMessageClick = async (message) => {
    try {
      const res = await messagesApi.getById(message.id);
      setSelectedMessage(res.data);
      loadMessages(); // Refresh to update read status
    } catch (error) {
      toast.error('Failed to load message');
    }
  };

  return (
    <DashboardLayout allowedRoles={['admin', 'teacher', 'parent']}>
      <div className="p-4 md:p-8 lg:p-12" data-testid="messages-page">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Messages</h1>
            <p className="text-muted-foreground">Communicate with teachers and parents</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="compose-message-btn">
                <Send className="w-4 h-4 mr-2" />
                Compose
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>New Message</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSend} className="space-y-4">
                <div className="space-y-2">
                  <Label>To</Label>
                  <Select value={form.recipient_id} onValueChange={(value) => setForm({ ...form, recipient_id: value })}>
                    <SelectTrigger data-testid="message-recipient-select">
                      <SelectValue placeholder="Select recipient" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name} ({user.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    required
                    data-testid="message-subject-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Message</Label>
                  <Textarea
                    id="content"
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    required
                    rows={5}
                    data-testid="message-content-input"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={sending} data-testid="send-message-btn">
                  {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <SendHorizontal className="w-4 h-4 mr-2" />}
                  Send Message
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Folder Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={folder === 'inbox' ? 'default' : 'outline'}
            onClick={() => { setFolder('inbox'); setSelectedMessage(null); }}
            data-testid="inbox-tab"
          >
            <Inbox className="w-4 h-4 mr-2" />
            Inbox
          </Button>
          <Button
            variant={folder === 'sent' ? 'default' : 'outline'}
            onClick={() => { setFolder('sent'); setSelectedMessage(null); }}
            data-testid="sent-tab"
          >
            <SendHorizontal className="w-4 h-4 mr-2" />
            Sent
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Message List */}
          <div className="lg:col-span-1 border rounded-lg overflow-hidden">
            {loading ? (
              <div className="p-4 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted rounded animate-pulse"></div>
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No messages in {folder}
              </div>
            ) : (
              <div className="divide-y">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    onClick={() => handleMessageClick(message)}
                    className={`message-item relative ${!message.is_read && folder === 'inbox' ? 'unread' : ''} ${selectedMessage?.id === message.id ? 'bg-muted' : ''}`}
                    data-testid={`message-item-${message.id}`}
                  >
                    <div className="flex items-start gap-3">
                      {folder === 'inbox' ? (
                        message.is_read ? <MailOpen className="w-5 h-5 text-muted-foreground mt-0.5" /> : <Mail className="w-5 h-5 text-primary mt-0.5" />
                      ) : (
                        <SendHorizontal className="w-5 h-5 text-muted-foreground mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate ${!message.is_read && folder === 'inbox' ? 'font-semibold' : ''}`}>
                          {folder === 'inbox' ? message.sender_name : message.recipient_name}
                        </p>
                        <p className="text-sm font-medium truncate">{message.subject}</p>
                        <p className="text-xs text-muted-foreground truncate">{message.content}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {format(new Date(message.created_at), 'MMM d, h:mm a')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Message Detail */}
          <div className="lg:col-span-2 border rounded-lg p-6">
            {selectedMessage ? (
              <div>
                <h2 className="text-xl font-semibold mb-4">{selectedMessage.subject}</h2>
                <div className="flex items-center justify-between mb-6 pb-4 border-b">
                  <div>
                    <p className="text-sm">
                      <span className="text-muted-foreground">From:</span>{' '}
                      <span className="font-medium">{selectedMessage.sender_name}</span>
                    </p>
                    <p className="text-sm">
                      <span className="text-muted-foreground">To:</span>{' '}
                      <span className="font-medium">{selectedMessage.recipient_name}</span>
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedMessage.created_at), 'MMMM d, yyyy h:mm a')}
                  </p>
                </div>
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap">{selectedMessage.content}</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Mail className="w-12 h-12 mb-4 opacity-50" />
                <p>Select a message to read</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
