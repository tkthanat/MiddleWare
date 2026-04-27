import { useLogs } from '../hooks/useLogs';
import SummaryBar from '../components/Logs/SummaryBar';
import LogsTable from '../components/Logs/LogsTable';
import '../css/LogsPage.css';

function LogsPage() {
  const { 
      summary, 
      currentLogs, 
      emptyRows, 
      currentPage, 
      setCurrentPage, 
      totalPages, 
      searchTerm, 
      handleSearch,
      filterType,
      handleFilterChange,
      summaryFilter,
      handleSummaryFilter,
      refreshLogs,
      exportCSV
  } = useLogs();

  return (
    <div className="container pb-5">
      <SummaryBar 
          summary={summary} 
          activeFilter={summaryFilter}
          onFilterChange={handleSummaryFilter}
      />

      <LogsTable 
          logs={currentLogs}
          searchTerm={searchTerm}
          onSearchChange={handleSearch}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          emptyRows={emptyRows}
          filterType={filterType}
          onFilterChange={handleFilterChange}
          onRefresh={refreshLogs}
          onExport={exportCSV}
      />
    </div>
  );
}

export default LogsPage;