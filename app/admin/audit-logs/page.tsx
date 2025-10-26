'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  Paper,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Badge,
} from '@mui/material';
import {
  Search,
  FilterList,
  Visibility,
  Refresh,
  AdminPanelSettings,
  Person,
  Security,
  Payment,
  AccountCircle,
  Group,
  Receipt,
  Block,
  CheckCircle,
  PlayCircle,
} from '@mui/icons-material';
import { format, formatDistanceToNow } from 'date-fns';

interface AuditLogActor {
  _id: string;
  username: string;
  email: string;
}

interface AdminAuditLog {
  _id: string;
  actor_id: AuditLogActor;
  action: string;
  action_type: string;
  target_type: string;
  target_id: string;
  resource_type: string;
  resource_id: string;
  changes: Record<string, any>;
  metadata: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  status: 'success' | 'failed' | 'pending';
  created_at: string;
  updated_at: string;
}

interface PaginatedResponse {
  logs: AdminAuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function AuditLogsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AdminAuditLog | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // Check if user is admin
  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/auth/signin');
      return;
    }

    // Check user role - adjust this based on your session structure
    const userRole = (session.user as any)?.role;
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      router.push('/dashboard');
      return;
    }

    fetchAuditLogs();
  }, [session, status, router, page, rowsPerPage]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: (page + 1).toString(),
        limit: rowsPerPage.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(actionFilter !== 'all' && { action: actionFilter }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
      });

      const response = await fetch(`/api/admin/audit-logs?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }

      const data: PaginatedResponse = await response.json();
      setLogs(data.logs);
      setTotalCount(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs');
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(0);
    fetchAuditLogs();
  };

  const handleActionFilterChange = (event: any) => {
    setActionFilter(event.target.value);
    setPage(0);
  };

  const handleStatusFilterChange = (event: any) => {
    setStatusFilter(event.target.value);
    setPage(0);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewDetails = (log: AdminAuditLog) => {
    setSelectedLog(log);
    setDetailDialogOpen(true);
  };

  const handleCloseDetailDialog = () => {
    setDetailDialogOpen(false);
    setSelectedLog(null);
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE_USER':
      case 'REGISTER_USER':
        return <Person color="primary" />;
      case 'UPDATE_USER':
        return <AccountCircle color="info" />;
      case 'ACTIVATE_USER':
      case 'ACTIVATE_ACCOUNT':
        return <CheckCircle color="success" />;
      case 'DELETE_USER':
      case 'BLOCK_USER':
      case 'DEACTIVATE_USER':
        return <Block color="error" />;
      case 'CREATE_PAYMENT':
      case 'PROCESS_PAYMENT':
        return <Payment color="success" />;
      case 'ADMIN_LOGIN':
      case 'SUPER_ADMIN_ACTION':
        return <Security color="warning" />;
      case 'UPDATE_SETTINGS':
      case 'SYSTEM_ACTION':
        return <AdminPanelSettings color="secondary" />;
      case 'CREATE_REFERRAL':
      case 'PROCESS_REFERRAL_BONUS':
        return <Group color="primary" />;
      case 'CREATE_TRANSACTION':
      case 'UPDATE_TRANSACTION':
        return <Receipt color="action" />;
      default:
        return <PlayCircle color="disabled" />;
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('CREATE') || action.includes('ACTIVATE') || action.includes('SUCCESS')) {
      return 'success';
    }
    if (action.includes('UPDATE') || action.includes('PROCESS')) {
      return 'info';
    }
    if (action.includes('DELETE') || action.includes('BLOCK') || action.includes('FAILED')) {
      return 'error';
    }
    if (action.includes('ADMIN') || action.includes('SYSTEM')) {
      return 'warning';
    }
    return 'default';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'failed':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatActionText = (action: string) => {
    return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const getActionCategories = () => {
    const actions = [...new Set(logs.map(log => log.action))];
    return actions.sort();
  };

  // Add loading state
  if (status === 'loading' || loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Audit Logs
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Monitor and track all administrative activities and system events
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filters and Search */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={4}>
              <form onSubmit={handleSearchSubmit}>
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Search logs, users, actions..."
                  value={searchTerm}
                  onChange={handleSearch}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                />
              </form>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Action Type</InputLabel>
                <Select
                  value={actionFilter}
                  onChange={handleActionFilterChange}
                  label="Action Type"
                  startAdornment={
                    <InputAdornment position="start">
                      <FilterList />
                    </InputAdornment>
                  }
                >
                  <MenuItem value="all">All Actions</MenuItem>
                  {getActionCategories().map(action => (
                    <MenuItem key={action} value={action}>
                      {formatActionText(action)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={handleStatusFilterChange}
                  label="Status"
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="success">Success</MenuItem>
                  <MenuItem value="failed">Failed</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={2}>
              <Tooltip title="Refresh logs">
                <IconButton 
                  onClick={fetchAuditLogs}
                  sx={{ 
                    bgcolor: 'primary.main', 
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    }
                  }}
                >
                  <Refresh />
                </IconButton>
              </Tooltip>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="overline">
                    Total Logs
                  </Typography>
                  <Typography variant="h4">{totalCount.toLocaleString()}</Typography>
                </Box>
                <Badge badgeContent={logs.length} color="primary">
                  <Receipt color="action" />
                </Badge>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="overline">
                    Successful
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {logs.filter(log => log.status === 'success').length.toLocaleString()}
                  </Typography>
                </Box>
                <Chip label="Success" color="success" size="small" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="overline">
                    Failed
                  </Typography>
                  <Typography variant="h4" color="error.main">
                    {logs.filter(log => log.status === 'failed').length.toLocaleString()}
                  </Typography>
                </Box>
                <Chip label="Failed" color="error" size="small" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="overline">
                    Unique Actors
                  </Typography>
                  <Typography variant="h4" color="info.main">
                    {new Set(logs.map(log => log.actor_id?._id)).size}
                  </Typography>
                </Box>
                <Group color="action" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Audit Logs Table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Action</TableCell>
                  <TableCell>Actor</TableCell>
                  <TableCell>Target</TableCell>
                  <TableCell>Changes</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography variant="body1" color="text.secondary">
                        No audit logs found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log._id} hover>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          {getActionIcon(log.action)}
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {formatActionText(log.action)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {log.action_type}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {log.actor_id?.username || 'Unknown'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {log.actor_id?.email || 'N/A'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={log.target_type} 
                          variant="outlined" 
                          size="small" 
                          color={getActionColor(log.action) as any}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap>
                          {Object.keys(log.changes || {}).length > 0 
                            ? `${Object.keys(log.changes).length} changes`
                            : 'No changes'
                          }
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={log.status} 
                          color={getStatusColor(log.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">
                            {format(new Date(log.created_at), 'MMM dd, yyyy')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {format(new Date(log.created_at), 'HH:mm:ss')}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="View Details">
                          <IconButton 
                            size="small" 
                            onClick={() => handleViewDetails(log)}
                            color="primary"
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={totalCount}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog 
        open={detailDialogOpen} 
        onClose={handleCloseDetailDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Audit Log Details
        </DialogTitle>
        <DialogContent>
          {selectedLog && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Action
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {formatActionText(selectedLog.action)}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Action Type
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedLog.action_type}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Actor
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedLog.actor_id?.username || 'Unknown'} ({selectedLog.actor_id?.email || 'N/A'})
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Target Type
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedLog.target_type}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Resource Type
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedLog.resource_type}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Status
                  </Typography>
                  <Chip 
                    label={selectedLog.status} 
                    color={getStatusColor(selectedLog.status) as any}
                    size="small"
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Timestamp
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {format(new Date(selectedLog.created_at), 'PPPPpp')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatDistanceToNow(new Date(selectedLog.created_at))} ago
                  </Typography>
                </Grid>

                {selectedLog.ip_address && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      IP Address
                    </Typography>
                    <Typography variant="body1" fontFamily="monospace">
                      {selectedLog.ip_address}
                    </Typography>
                  </Grid>
                )}

                {selectedLog.user_agent && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      User Agent
                    </Typography>
                    <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem">
                      {selectedLog.user_agent}
                    </Typography>
                  </Grid>
                )}

                {Object.keys(selectedLog.changes || {}).length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Changes Made
                    </Typography>
                    <Card variant="outlined">
                      <CardContent>
                        <pre style={{ 
                          margin: 0, 
                          fontSize: '0.75rem',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-all'
                        }}>
                          {JSON.stringify(selectedLog.changes, null, 2)}
                        </pre>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Additional Metadata
                    </Typography>
                    <Card variant="outlined">
                      <CardContent>
                        <pre style={{ 
                          margin: 0, 
                          fontSize: '0.75rem',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-all'
                        }}>
                          {JSON.stringify(selectedLog.metadata, null, 2)}
                        </pre>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetailDialog}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
