'use client';

import {
  Title,
  Text,
  Group,
  Stack,
  Box,
  Paper,
  TextInput,
  Textarea,
  Button,
  Badge,
  ActionIcon,
  Card,
  Modal,
  Loader,
  Alert
} from '@mantine/core';
import { useState, useEffect } from 'react';
import { 
  IconTrash, 
  IconEdit, 
  IconPlus,
  IconRefresh,
  IconAlertCircle 
} from '@tabler/icons-react';
import { getQuestionId } from './getQuestionId';


// Define the FAQ data type based on the API
interface FAQ {
  id?: string;
  question: string;
  answer: string;
  created_at?: string;
}

export default function FAQEditorPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalOpened, setModalOpened] = useState(false);
  const [deleteConfirmOpened, setDeleteConfirmOpened] = useState(false);
  const [faqToDelete, setFaqToDelete] = useState<FAQ | null>(null);
  const [generatingId, setGeneratingId] = useState(false);
  const [hasGeneratedId, setHasGeneratedId] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    question: '',
    answer: ''
  });

  // Fetch FAQs from API
  const fetchFAQs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/faqs');
      if (!response.ok) throw new Error('Failed to fetch FAQs');
      const data = await response.json();
      setFaqs(data.faqs || []);
    } catch (err) {
      setError('Failed to load FAQs. Please try again.');
      console.error('Error fetching FAQs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFAQs();
  }, []);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleQuestionBlur = async () => {
    // Only generate ID if question exists and ID is empty (for new FAQs)
    if (formData.question.trim() && !formData.id && !editingId) {
      await generateId();
    }
  };

  const generateId = async () => {
    if (!formData.question.trim()) return;
    
    setGeneratingId(true);
    setHasGeneratedId(true);
    try {
      const generatedId = await getQuestionId(formData.question);
      setFormData(prev => ({
        ...prev,
        id: generatedId
      }));
    } catch (error) {
      console.error('Failed to generate question ID:', error);
      // Fallback to manual generation if API fails
      const fallbackId = formData.question
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setFormData(prev => ({
        ...prev,
        id: fallbackId
      }));
    } finally {
      setGeneratingId(false);
    }
  };

  const handleRefreshId = () => {
    generateId();
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.question.trim() || !formData.answer.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const faqData: FAQ = {
        id: formData.id || formData.question.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
        question: formData.question.trim(),
        answer: formData.answer.trim()
      };

      if (editingId) {
        // Update existing FAQ
        const response = await fetch(`/api/faqs/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(faqData)
        });

        if (!response.ok) throw new Error('Failed to update FAQ');
        
        const { faq } = await response.json();
        setFaqs(prev => prev.map(f => f.id === editingId ? faq : f));
        setEditingId(null);
      } else {
        // Add new FAQ
        const response = await fetch('/api/faqs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(faqData)
        });

        if (!response.ok) throw new Error('Failed to create FAQ');
        
        const { faq } = await response.json();
        setFaqs(prev => [...prev, faq]);
      }

      // Reset form and close modal
      setFormData({ id: '', question: '', answer: '' });
      setModalOpened(false);
      setHasGeneratedId(false);
    } catch (err) {
      setError('Failed to save FAQ. Please try again.');
      console.error('Error saving FAQ:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (faq: FAQ) => {
    setFormData({
      id: faq.id || '',
      question: faq.question,
      answer: faq.answer
    });
    setEditingId(faq.id || null);
    setHasGeneratedId(true); // Enable refresh button for existing FAQs
    setModalOpened(true);
  };

  const handleDeleteClick = (faq: FAQ) => {
    setFaqToDelete(faq);
    setDeleteConfirmOpened(true);
  };

  const handleConfirmDelete = async () => {
    if (faqToDelete && faqToDelete.id) {
      try {
        setError(null);
        const response = await fetch(`/api/faqs/${faqToDelete.id}`, {
          method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to delete FAQ');
        
        setFaqs(prev => prev.filter(faq => faq.id !== faqToDelete.id));
        if (editingId === faqToDelete.id) {
          setEditingId(null);
          setFormData({ id: '', question: '', answer: '' });
          setModalOpened(false);
        }
      } catch (err) {
        setError('Failed to delete FAQ. Please try again.');
        console.error('Error deleting FAQ:', err);
      }
    }
    setDeleteConfirmOpened(false);
    setFaqToDelete(null);
  };

  const handleCancelDelete = () => {
    setDeleteConfirmOpened(false);
    setFaqToDelete(null);
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({ id: '', question: '', answer: '' });
    setHasGeneratedId(false);
    setModalOpened(false);
  };

  const handleAddNew = () => {
    setEditingId(null);
    setFormData({ id: '', question: '', answer: '' });
    setHasGeneratedId(false);
    setModalOpened(true);
  };

  if (loading) {
    return (
      <Stack gap="xl" align="center" style={{ paddingTop: '2rem' }}>
        <Loader size="lg" color="#8b7355" />
        <Text size="lg" color="#6c757d">Loading FAQs...</Text>
      </Stack>
    );
  }

  return (
    <Stack gap="xl">
      <Box style={{ textAlign: 'center' }}>
        <Title
          order={2}
          style={{
            fontSize: 'clamp(1.8rem, 5vw, 2.2rem)',
            fontWeight: 300,
            color: '#495057',
            marginBottom: '0.5rem',
            fontFamily: 'serif',
          }}
        >
          FAQ Editor
        </Title>
        <Text size="lg" style={{ color: '#6c757d' }}>
          Create and manage frequently asked questions
        </Text>
      </Box>

      {error && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          color="red"
          variant="light"
          onClose={() => setError(null)}
          withCloseButton
        >
          {error}
        </Alert>
      )}

      {/* Add FAQ Button */}
      <Group justify="center">
        <Button
          size="lg"
          leftSection={<IconPlus size={20} />}
          onClick={handleAddNew}
          style={{
            backgroundColor: '#8b7355',
            borderColor: '#8b7355',
          }}
        >
          Add New FAQ
        </Button>
      </Group>

      {/* Existing FAQs */}
      <Box>
        <Group justify="space-between" align="center" mb="lg">
          <Title order={3} style={{ color: '#495057', fontFamily: 'serif' }}>
            Existing FAQs
          </Title>
          <Badge variant="light" color="#8b7355">
            {faqs.length} FAQ{faqs.length !== 1 ? 's' : ''}
          </Badge>
        </Group>

        <Stack gap="md">
          {faqs.map((faq) => (
            <Card
              key={faq.id}
              shadow="sm"
              padding="lg"
              radius="md"
              withBorder
              style={{
                backgroundColor: editingId === faq.id ? '#f8f9fa' : '#ffffff'
              }}
            >
              <Group justify="space-between" align="flex-start" mb="sm">
                <Box style={{ flex: 1 }}>
                  <Text size="sm" c="dimmed" mb={4}>
                    ID: {faq.id}
                  </Text>
                  <Text size="lg" fw={500} mb="sm" style={{ color: '#495057' }}>
                    {faq.question}
                  </Text>
                  <Text style={{ color: '#6c757d', lineHeight: 1.6 }}>
                    {faq.answer}
                  </Text>
                </Box>
                <Group gap="xs">
                  <ActionIcon
                    variant="subtle"
                    color="blue"
                    onClick={() => handleEdit(faq)}
                    aria-label="Edit FAQ"
                  >
                    <IconEdit size={16} />
                  </ActionIcon>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    onClick={() => handleDeleteClick(faq)}
                    aria-label="Delete FAQ"
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Group>
            </Card>
          ))}
        </Stack>
        {faqs.length === 0 && (
          <Paper p="xl" style={{ textAlign: 'center', backgroundColor: '#f8f9fa' }}>
            <Text c="dimmed">
              No FAQs created yet. Use the button above to add your first FAQ.
            </Text>
          </Paper>
        )}
      </Box>

      {/* FAQ Form Modal */}
      <Modal
        opened={modalOpened}
        onClose={handleCancel}
        title={editingId ? 'Edit FAQ' : 'Add New FAQ'}
        size="lg"
        centered
        styles={{
          title: {
            color: '#495057',
            fontFamily: 'serif',
            fontSize: '1.5rem',
            fontWeight: 300,
          }
        }}
      >
        <form onSubmit={handleSubmit}>
          <Stack gap="lg">
            <Group gap="sm" align="flex-end">
              <Box style={{ flex: 1 }}>
                <TextInput
                  label="FAQ ID"
                  placeholder={generatingId ? "Generating..." : "Auto-generated from question"}
                  value={formData.id}
                  onChange={(e) => handleInputChange('id', e.target.value)}
                  description="Unique identifier for this FAQ"
                  styles={{
                    label: { color: '#495057', fontWeight: 500 },
                    input: { borderColor: '#dee2e6' }
                  }}
                />
              </Box>
              <ActionIcon
                variant="subtle"
                color="#8b7355"
                onClick={handleRefreshId}
                disabled={!hasGeneratedId}
                loading={generatingId}
                aria-label="Regenerate ID"
                size="lg"
              >
                <IconRefresh size={18} />
              </ActionIcon>
            </Group>

            <TextInput
              label="Question"
              placeholder="Enter the frequently asked question"
              required
              value={formData.question}
              onChange={(e) => handleInputChange('question', e.target.value)}
              onBlur={handleQuestionBlur}
              styles={{
                label: { color: '#495057', fontWeight: 500 },
                input: { borderColor: '#dee2e6' }
              }}
            />

            <Textarea
              label="Answer"
              placeholder="Enter the answer to this question"
              required
              rows={4}
              value={formData.answer}
              onChange={(e) => handleInputChange('answer', e.target.value)}
              styles={{
                label: { color: '#495057', fontWeight: 500 },
                input: { borderColor: '#dee2e6' }
              }}
            />

            <Group justify="flex-end" gap="sm">
              <Button
                variant="subtle"
                color="gray"
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                leftSection={<IconPlus size={16} />}
                loading={submitting}
                disabled={submitting}
                style={{
                  backgroundColor: '#8b7355',
                  borderColor: '#8b7355',
                }}
              >
                {editingId ? 'Update FAQ' : 'Add FAQ'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteConfirmOpened}
        onClose={handleCancelDelete}
        title="Confirm Delete"
        size="md"
        centered
        styles={{
          title: {
            color: '#ef4444',
            fontFamily: 'serif',
            fontSize: '1.5rem',
            fontWeight: 300,
          }
        }}
      >
        <Stack gap="lg">
          <Text style={{ color: '#495057' }}>
            Are you sure you want to delete this FAQ? This action cannot be undone.
          </Text>
          
          {faqToDelete && (
            <Paper p="md" style={{ backgroundColor: '#f8f9fa', border: '1px solid #e9ecef' }}>
              <Text size="sm" fw={500} mb="xs" style={{ color: '#495057' }}>
                Question: {faqToDelete.question}
              </Text>
              <Text size="sm" c="dimmed" style={{ 
                display: '-webkit-box', 
                WebkitLineClamp: 2, 
                WebkitBoxOrient: 'vertical', 
                overflow: 'hidden' 
              }}>
                Answer: {faqToDelete.answer}
              </Text>
            </Paper>
          )}

          <Group justify="flex-end" gap="sm">
            <Button
              variant="subtle"
              color="gray"
              onClick={handleCancelDelete}
            >
              Cancel
            </Button>
            <Button
              color="red"
              onClick={handleConfirmDelete}
            >
              Delete FAQ
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
