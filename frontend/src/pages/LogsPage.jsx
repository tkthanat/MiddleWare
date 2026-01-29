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
      handleFilterChange
  } = useLogs();

  return (
    <div className="container pb-5">
      <SummaryBar summary={summary} />

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
      />
    </div>
  );
}

export default LogsPage;