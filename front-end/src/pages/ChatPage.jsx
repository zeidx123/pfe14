import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import './ChatPage.css';
import {
    getUnreadStatsByPartner,
    getUnreadTotal,
    markConversationAsSeen
} from '../utils/chatUnread'

const ChatPage = ({ targetRoleFilter, onUnreadCountChange }) => {
    const [interlocutors, setInterlocutors] = useState([]);
    const [selectedPartner, setSelectedPartner] = useState(null);
    const [messages, setMessages] = useState([]);
    const [allMessages, setAllMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [connected, setConnected] = useState(false);

    const userId = useMemo(() => localStorage.getItem('userId'), []);
    const userRole = useMemo(() => localStorage.getItem('userRole'), []);
    const userName = useMemo(() => localStorage.getItem('userDisplayName'), []);
    const token = useMemo(() => localStorage.getItem('token'), []);

    const messagesEndRef = useRef(null);
    const stompClientRef = useRef(null);
    const selectedPartnerRef = useRef(null);

    // Garder une référence synchronisée du partenaire sélectionné
    useEffect(() => {
        selectedPartnerRef.current = selectedPartner;
    }, [selectedPartner]);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    // ─── Connexion WebSocket STOMP ───────────────────────────────────────────

    useEffect(() => {
        if (!userId || !token) return;

        const client = new Client({
            webSocketFactory: () => new SockJS('/ws', null, { transports: ['websocket'] }),
            reconnectDelay: 5000,
            onConnect: () => {
                setConnected(true);
                client.subscribe(`/user/${userId}/queue/messages`, (frame) => {
                    const incomingMsg = JSON.parse(frame.body);
                    const partner = selectedPartnerRef.current;

                    if (partner && (incomingMsg.senderId === partner.id || incomingMsg.receiverId === partner.id)) {
                        setMessages(prev => {
                            if (prev.some(m => m.id === incomingMsg.id)) return prev;
                            return [...prev, incomingMsg];
                        });
                    }

                    setAllMessages(prev => {
                        if (prev.some(m => m.id === incomingMsg.id)) return prev;
                        return [...prev, incomingMsg];
                    });
                });
            },
            onDisconnect: () => setConnected(false),
            onStompError: (frame) => console.error('Erreur STOMP :', frame.headers['message']),
        });

        client.activate();
        stompClientRef.current = client;
        return () => client.deactivate();
    }, [userId, token]);

    // ─── Fonctions de chargement des données ─────────────────────────────────

    const fetchInterlocutors = useCallback(async () => {
        if (!userId || !userRole) return;
        try {
            const response = await fetch(`/api/chat/interlocutors/${userId}/${userRole}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                const filteredData = targetRoleFilter
                    ? data.filter(i => targetRoleFilter.includes(i.role))
                    : data;
                setInterlocutors(filteredData);

                // Ne changer selectedPartner que si nécessaire (évite boucle de fetch)
                setSelectedPartner(current => {
                    if (filteredData.length > 0) {
                        if (!current || !filteredData.find(p => p.id === current.id)) {
                            return filteredData[0];
                        }
                    } else {
                        return null;
                    }
                    return current;
                });
            }
        } catch (error) {
            console.error("Erreur interlocuteurs", error);
        } finally {
            setLoading(false);
        }
    }, [userId, userRole, token, JSON.stringify(targetRoleFilter)]);

    const fetchMessages = useCallback(async () => {
        const partner = selectedPartnerRef.current;
        if (!partner || !userId) return;
        try {
            const response = await fetch(`/api/chat/conversation/${userId}/${partner.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setMessages(data);
            }
        } catch (error) {
            console.error("Erreur messages", error);
        }
    }, [userId, token]);

    const fetchAllMessages = useCallback(async () => {
        if (!userId) return;
        try {
            const response = await fetch(`/api/chat/all-my-messages/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setAllMessages(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error('Erreur all messages', error);
        }
    }, [userId, token]);

    // ─── Cycle de vie ────────────────────────────────────────────────────────

    useEffect(() => {
        fetchInterlocutors();
    }, [fetchInterlocutors]);

    useEffect(() => {
        if (selectedPartner) fetchMessages();
    }, [selectedPartner, fetchMessages]);

    useEffect(() => {
        fetchAllMessages();
    }, [fetchAllMessages]);

    useEffect(() => {
        if (!selectedPartner || !messages.length) return;
        const last = messages[messages.length - 1];
        markConversationAsSeen(userId, selectedPartner.id, last?.createdAt);
    }, [messages, selectedPartner, userId]);

    useEffect(() => {
        const unreadStats = getUnreadStatsByPartner(allMessages, userId, targetRoleFilter || []);
        const total = getUnreadTotal(unreadStats);
        if (typeof onUnreadCountChange === 'function') {
            onUnreadCountChange(total);
        }
    }, [allMessages, userId, JSON.stringify(targetRoleFilter), onUnreadCountChange]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    // ─── Envoi de message ─────────────────────────────────────────────────────

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedPartner) return;

        const chatMsg = {
            senderId: userId, senderName: userName, senderRole: userRole,
            receiverId: selectedPartner.id, receiverName: selectedPartner.name,
            receiverRole: selectedPartner.role, content: newMessage
        };

        try {
            if (connected && stompClientRef.current?.connected) {
                stompClientRef.current.publish({ destination: '/app/chat.send', body: JSON.stringify(chatMsg) });
            } else {
                const response = await fetch('/api/chat/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(chatMsg)
                });
                if (response.ok) {
                    const saved = await response.json();
                    setMessages(prev => [...prev, saved]);
                    setAllMessages(prev => [...prev, saved]);
                }
            }
            setNewMessage('');
        } catch (error) { console.error("Erreur envoi", error); }
    };

    // ─── Rendu ────────────────────────────────────────────────────────────────

    if (loading) return <div className="chat-loading">Chargement de la messagerie...</div>;

    const unreadStats = getUnreadStatsByPartner(allMessages, userId, targetRoleFilter || []);

    return (
        <div className="chat-container">
            <div className="chat-sidebar">
                <div className="sidebar-header">
                    <h3>Conversations</h3>
                    <span className={`ws-status ${connected ? 'ws-connected' : 'ws-disconnected'}`}
                        title={connected ? 'Connecté en temps réel' : 'Mode hors ligne'}>
                        {connected ? '🟢' : '🔴'}
                    </span>
                </div>
                <div className="interlocutors-list">
                    {interlocutors.length === 0 && <p className="no-contacts">Aucun contact disponible</p>}
                    {interlocutors.map(partner => (
                        <div
                            key={partner.id}
                            className={`interlocutor-item ${selectedPartner?.id === partner.id ? 'active' : ''}`}
                            onClick={() => setSelectedPartner(partner)}
                        >
                            <div className="avatar">{partner.name.charAt(0)}</div>
                            <div className="partner-info">
                                <span className="partner-name-row">
                                    <span className="partner-name">{partner.name}</span>
                                    {unreadStats[partner.id] > 0 && (
                                        <span className="message-pill-badge">{unreadStats[partner.id] > 9 ? '9+' : unreadStats[partner.id]}</span>
                                    )}
                                </span>
                                <span className="partner-role">{partner.role}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="chat-main">
                {selectedPartner ? (
                    <>
                        <div className="chat-header">
                            <div className="avatar">{selectedPartner.name.charAt(0)}</div>
                            <div className="header-info">
                                <h4>{selectedPartner.name}</h4>
                                <span>{selectedPartner.role}</span>
                            </div>
                        </div>
                        <div className="messages-display">
                            {messages.map((msg, index) => (
                                <div key={msg.id || index} className={`message-wrapper ${msg.senderId === userId ? 'sent' : 'received'}`}>
                                    <div className="message-content">
                                        <p>{msg.content}</p>
                                        <span className="message-time">
                                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                        <form className="chat-input-area" onSubmit={handleSendMessage}>
                            <input
                                type="text"
                                placeholder="Écrivez votre message..."
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                            />
                            <button type="submit" disabled={!newMessage.trim()}>
                                <svg viewBox="0 0 24 24" width="24" height="24">
                                    <path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                                </svg>
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="no-selection">
                        <div className="no-selection-content">
                            <i className="chat-icon">💬</i>
                            <h3>Bienvenue dans votre messagerie</h3>
                            <p>Sélectionnez un contact pour commencer à discuter.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatPage;
