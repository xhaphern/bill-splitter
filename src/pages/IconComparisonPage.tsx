import { Icon } from '@iconify/react';
import { useState } from 'react';
import {
  Menu, X, LogIn, LogOut, UserCircle,
  Search, Receipt, Home, Clock3, ChevronRight, ChevronDown, MoreVertical,
  Plus, PlusCircle, Download, Upload, Share2, SaveIcon,
  Users, UserPlus, Calculator, Pencil, CreditCard, Phone,
  CheckCircle2, AlertTriangle, XCircle, Copy, FileText, Calendar,
  Trash2, ScanText, Loader2
} from '../icons';

const iconComparisons = [
  // Navigation / Chrome
  { name: 'Menu', current: Menu, material: 'material-symbols:menu-rounded', solar: 'solar:hamburger-menu-linear', tabler: 'tabler:menu-2', mingcute: 'mingcute:menu-line', remix: 'ri:menu-line', bootstrap: 'bi:list', linemd: null, spinner: null, category: 'Navigation' },
  { name: 'X (Close)', current: X, material: 'material-symbols:close-rounded', solar: 'solar:close-circle-linear', tabler: 'tabler:x', mingcute: 'mingcute:close-line', remix: 'ri:close-line', bootstrap: 'bi:x-lg', linemd: 'line-md:close', spinner: null, category: 'Navigation' },

  // Auth
  { name: 'LogIn', current: LogIn, material: 'material-symbols:login-rounded', solar: 'solar:login-linear', tabler: 'tabler:login', mingcute: 'mingcute:entrance-line', remix: 'ri:login-box-line', bootstrap: 'bi:box-arrow-in-right', linemd: null, spinner: null, category: 'Auth' },
  { name: 'LogOut', current: LogOut, material: 'material-symbols:logout-rounded', solar: 'solar:logout-linear', tabler: 'tabler:logout', mingcute: 'mingcute:exit-line', remix: 'ri:logout-box-line', bootstrap: 'bi:box-arrow-right', linemd: null, spinner: null, category: 'Auth' },
  { name: 'UserCircle', current: UserCircle, material: 'material-symbols:account-circle-rounded', solar: 'solar:user-circle-linear', tabler: 'tabler:user-circle', mingcute: 'mingcute:user-4-line', remix: 'ri:user-line', bootstrap: 'bi:person-circle', linemd: null, spinner: null, category: 'Auth' },

  // General UI
  { name: 'Search', current: Search, material: 'material-symbols:search-rounded', solar: 'solar:magnifer-linear', tabler: 'tabler:search', mingcute: 'mingcute:search-line', remix: 'ri:search-line', bootstrap: 'bi:search', linemd: 'line-md:search', spinner: null, category: 'General UI' },
  { name: 'Receipt', current: Receipt, material: 'material-symbols:receipt-long-rounded', solar: 'solar:bill-list-linear', tabler: 'tabler:receipt', mingcute: 'mingcute:bill-line', remix: 'ri:bill-line', bootstrap: 'bi:receipt', linemd: null, spinner: null, category: 'General UI' },
  { name: 'Home', current: Home, material: 'material-symbols:home-rounded', solar: 'solar:home-linear', tabler: 'tabler:home', mingcute: 'mingcute:home-3-line', remix: 'ri:home-line', bootstrap: 'bi:house', linemd: 'line-md:home', spinner: null, category: 'General UI' },
  { name: 'Clock', current: Clock3, material: 'material-symbols:schedule-rounded', solar: 'solar:clock-circle-linear', tabler: 'tabler:clock', mingcute: 'mingcute:time-line', remix: 'ri:time-line', bootstrap: 'bi:clock', linemd: null, spinner: null, category: 'General UI' },
  { name: 'ChevronRight', current: ChevronRight, material: 'material-symbols:chevron-right-rounded', solar: 'solar:alt-arrow-right-linear', tabler: 'tabler:chevron-right', mingcute: 'mingcute:right-line', remix: 'ri:arrow-right-s-line', bootstrap: 'bi:chevron-right', linemd: 'line-md:chevron-right', spinner: null, category: 'General UI' },
  { name: 'ChevronDown', current: ChevronDown, material: 'material-symbols:expand-more-rounded', solar: 'solar:alt-arrow-down-linear', tabler: 'tabler:chevron-down', mingcute: 'mingcute:down-line', remix: 'ri:arrow-down-s-line', bootstrap: 'bi:chevron-down', linemd: 'line-md:chevron-down', spinner: null, category: 'General UI' },
  { name: 'MoreVertical', current: MoreVertical, material: 'material-symbols:more-vert-rounded', solar: 'solar:menu-dots-linear', tabler: 'tabler:dots-vertical', mingcute: 'mingcute:more-1-line', remix: 'ri:more-line', bootstrap: 'bi:three-dots-vertical', linemd: null, spinner: null, category: 'General UI' },

  // Actions
  { name: 'Plus', current: Plus, material: 'material-symbols:add-rounded', solar: 'solar:add-circle-linear', tabler: 'tabler:plus', mingcute: 'mingcute:add-line', remix: 'ri:add-line', bootstrap: 'bi:plus-lg', linemd: null, spinner: null, category: 'Actions' },
  { name: 'PlusCircle', current: PlusCircle, material: 'material-symbols:add-circle-outline-rounded', solar: 'solar:add-circle-linear', tabler: 'tabler:circle-plus', mingcute: 'mingcute:add-circle-line', remix: 'ri:add-circle-line', bootstrap: 'bi:plus-circle', linemd: null, spinner: null, category: 'Actions' },
  { name: 'Download', current: Download, material: 'material-symbols:download-rounded', solar: 'solar:download-linear', tabler: 'tabler:download', mingcute: 'mingcute:download-2-line', remix: 'ri:download-line', bootstrap: 'bi:download', linemd: 'line-md:download-outline', spinner: null, category: 'Actions' },
  { name: 'Upload', current: Upload, material: 'material-symbols:upload-rounded', solar: 'solar:upload-linear', tabler: 'tabler:upload', mingcute: 'mingcute:upload-2-line', remix: 'ri:upload-line', bootstrap: 'bi:upload', linemd: 'line-md:upload-outline', spinner: null, category: 'Actions' },
  { name: 'Share', current: Share2, material: 'material-symbols:share-rounded', solar: 'solar:share-linear', tabler: 'tabler:share', mingcute: 'mingcute:share-2-line', remix: 'ri:share-line', bootstrap: 'bi:share', linemd: null, spinner: null, category: 'Actions' },
  { name: 'Save', current: SaveIcon, material: 'material-symbols:save-rounded', solar: 'solar:diskette-linear', tabler: 'tabler:device-floppy', mingcute: 'mingcute:save-line', remix: 'ri:save-line', bootstrap: 'bi:floppy', linemd: null, spinner: null, category: 'Actions' },

  // Content
  { name: 'Users', current: Users, material: 'material-symbols:group-rounded', solar: 'solar:users-group-rounded-linear', tabler: 'tabler:users', mingcute: 'mingcute:group-line', remix: 'ri:group-line', bootstrap: 'bi:people', linemd: null, spinner: null, category: 'Content' },
  { name: 'UserPlus', current: UserPlus, material: 'material-symbols:person-add-rounded', solar: 'solar:user-plus-linear', tabler: 'tabler:user-plus', mingcute: 'mingcute:user-add-line', remix: 'ri:user-add-line', bootstrap: 'bi:person-plus', linemd: null, spinner: null, category: 'Content' },
  { name: 'Calculator', current: Calculator, material: 'material-symbols:calculate-rounded', solar: 'solar:calculator-linear', tabler: 'tabler:calculator', mingcute: 'mingcute:calculator-line', remix: 'ri:calculator-line', bootstrap: 'bi:calculator', linemd: null, spinner: null, category: 'Content' },
  { name: 'Pencil', current: Pencil, material: 'material-symbols:edit-rounded', solar: 'solar:pen-linear', tabler: 'tabler:pencil', mingcute: 'mingcute:pencil-line', remix: 'ri:pencil-line', bootstrap: 'bi:pencil', linemd: 'line-md:edit', spinner: null, category: 'Content' },
  { name: 'CreditCard', current: CreditCard, material: 'material-symbols:credit-card-rounded', solar: 'solar:card-linear', tabler: 'tabler:credit-card', mingcute: 'mingcute:bank-card-line', remix: 'ri:bank-card-line', bootstrap: 'bi:credit-card', linemd: null, spinner: null, category: 'Content' },
  { name: 'Phone', current: Phone, material: 'material-symbols:call-rounded', solar: 'solar:phone-linear', tabler: 'tabler:phone', mingcute: 'mingcute:phone-line', remix: 'ri:phone-line', bootstrap: 'bi:telephone', linemd: null, spinner: null, category: 'Content' },
  { name: 'CheckCircle', current: CheckCircle2, material: 'material-symbols:check-circle-rounded', solar: 'solar:check-circle-linear', tabler: 'tabler:circle-check', mingcute: 'mingcute:check-circle-line', remix: 'ri:checkbox-circle-line', bootstrap: 'bi:check-circle', linemd: 'line-md:confirm-circle', spinner: null, category: 'Content' },
  { name: 'AlertTriangle', current: AlertTriangle, material: 'material-symbols:warning-rounded', solar: 'solar:danger-triangle-linear', tabler: 'tabler:alert-triangle', mingcute: 'mingcute:alert-line', remix: 'ri:alert-line', bootstrap: 'bi:exclamation-triangle', linemd: 'line-md:alert', spinner: null, category: 'Content' },
  { name: 'XCircle', current: XCircle, material: 'material-symbols:cancel-rounded', solar: 'solar:close-circle-linear', tabler: 'tabler:circle-x', mingcute: 'mingcute:close-circle-line', remix: 'ri:close-circle-line', bootstrap: 'bi:x-circle', linemd: 'line-md:close-circle', spinner: null, category: 'Content' },
  { name: 'Copy', current: Copy, material: 'material-symbols:content-copy-rounded', solar: 'solar:copy-linear', tabler: 'tabler:copy', mingcute: 'mingcute:copy-2-line', remix: 'ri:file-copy-line', bootstrap: 'bi:clipboard', linemd: null, spinner: null, category: 'Content' },
  { name: 'FileText', current: FileText, material: 'material-symbols:description-rounded', solar: 'solar:document-text-linear', tabler: 'tabler:file-text', mingcute: 'mingcute:file-info-line', remix: 'ri:file-text-line', bootstrap: 'bi:file-text', linemd: null, spinner: null, category: 'Content' },
  { name: 'Calendar', current: Calendar, material: 'material-symbols:calendar-month-rounded', solar: 'solar:calendar-linear', tabler: 'tabler:calendar', mingcute: 'mingcute:calendar-line', remix: 'ri:calendar-line', bootstrap: 'bi:calendar', linemd: 'line-md:calendar', spinner: null, category: 'Content' },
  { name: 'Trash', current: Trash2, material: 'material-symbols:delete-rounded', solar: 'solar:trash-bin-trash-linear', tabler: 'tabler:trash', mingcute: 'mingcute:delete-2-line', remix: 'ri:delete-bin-line', bootstrap: 'bi:trash', linemd: null, spinner: null, category: 'Content' },
  { name: 'Scan', current: ScanText, material: 'material-symbols:document-scanner-rounded', solar: 'solar:document-linear', tabler: 'tabler:scan', mingcute: 'mingcute:document-line', remix: 'ri:file-list-line', bootstrap: 'bi:upc-scan', linemd: null, spinner: null, category: 'Content' },

  // Loading - Multiple spinner options to compare
  { name: 'Loader (Option 1)', current: Loader2, material: 'material-symbols:progress-activity-rounded', solar: 'solar:refresh-circle-linear', tabler: 'tabler:loader-2', mingcute: 'mingcute:loading-line', remix: 'ri:loader-line', bootstrap: 'bi:arrow-repeat', linemd: 'line-md:loading-twotone-loop', spinner: 'svg-spinners:ring-resize', category: 'Loading' },
  { name: 'Loader (Option 2)', current: Loader2, material: 'material-symbols:progress-activity-rounded', solar: 'solar:refresh-circle-linear', tabler: 'tabler:loader-2', mingcute: 'mingcute:loading-line', remix: 'ri:loader-line', bootstrap: 'bi:arrow-clockwise', linemd: 'line-md:loading-loop', spinner: 'svg-spinners:180-ring', category: 'Loading' },
  { name: 'Loader (Option 3)', current: Loader2, material: 'material-symbols:progress-activity-rounded', solar: 'solar:refresh-circle-linear', tabler: 'tabler:loader-2', mingcute: 'mingcute:loading-line', remix: 'ri:loader-line', bootstrap: 'bi:hourglass-split', linemd: 'line-md:loading-alt-loop', spinner: 'svg-spinners:90-ring-with-bg', category: 'Loading' },
  { name: 'Loader (Option 4)', current: Loader2, material: 'material-symbols:progress-activity-rounded', solar: 'solar:refresh-circle-linear', tabler: 'tabler:loader-2', mingcute: 'mingcute:loading-line', remix: 'ri:loader-line', bootstrap: 'bi:arrow-repeat', linemd: null, spinner: 'svg-spinners:blocks-shuffle-3', category: 'Loading' },
  { name: 'Loader (Option 5)', current: Loader2, material: 'material-symbols:progress-activity-rounded', solar: 'solar:refresh-circle-linear', tabler: 'tabler:loader-2', mingcute: 'mingcute:loading-line', remix: 'ri:loader-line', bootstrap: 'bi:arrow-repeat', linemd: null, spinner: 'svg-spinners:pulse-rings-multiple', category: 'Loading' },
];

type IconSelection = {
  iconName: string;
  source: 'current' | 'material' | 'solar' | 'tabler' | 'mingcute' | 'remix' | 'bootstrap' | 'linemd' | 'spinner';
  iconCode: string;
};

export default function IconComparisonPage() {
  const categories = Array.from(new Set(iconComparisons.map(i => i.category)));
  const [selections, setSelections] = useState<Record<string, IconSelection>>({});

  const handleSelection = (iconName: string, source: IconSelection['source'], iconCode: string) => {
    setSelections(prev => ({
      ...prev,
      [iconName]: { iconName, source, iconCode }
    }));
  };

  const isSelected = (iconName: string, source: IconSelection['source']) => {
    return selections[iconName]?.source === source;
  };

  const exportCode = Object.entries(selections)
    .map(([name, sel]) => `${name}: ${sel.iconCode} (${sel.source})`)
    .join('\n');

  const copyToClipboard = () => {
    navigator.clipboard.writeText(exportCode);
    alert('Copied to clipboard!');
  };

  return (
    <div className="page-container pb-20">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Icon Comparison</h1>
        <p className="text-gray-600 mb-6">
          Current Phosphor Icons vs Iconify Alternatives (Material Symbols, Solar, Tabler, Mingcute, Remix Icon, Bootstrap Icons, Line MD & SVG Spinners)
        </p>

        {categories.map(category => (
          <div key={category} className="mb-8">
            <h2 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2">
              {category}
            </h2>

            <div className="space-y-3">
              {iconComparisons
                .filter(item => item.category === category)
                .map(({ name, current: CurrentIcon, material, solar, tabler, mingcute, remix, bootstrap, linemd, spinner }) => (
                  <div
                    key={name}
                    className="glass-panel p-4 flex items-center gap-2 overflow-x-auto"
                  >
                    {/* Icon Name */}
                    <div className="flex-shrink-0 min-w-[120px]">
                      <div className="font-medium text-white text-sm">{name}</div>
                    </div>

                    {/* Current Icon */}
                    <div className="flex flex-col items-center gap-1 flex-shrink-0 w-[70px]">
                      <input
                        type="checkbox"
                        checked={isSelected(name, 'current')}
                        onChange={() => handleSelection(name, 'current', 'phosphor')}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <div className="w-10 h-10 flex items-center justify-center bg-blue-50 rounded-lg">
                        <CurrentIcon size={24} className="text-blue-600" />
                      </div>
                      <div className="text-[10px] text-gray-400">Phosphor</div>
                    </div>

                    {/* Material Symbols Icon */}
                    <div className="flex flex-col items-center gap-1 flex-shrink-0 w-[70px]">
                      <input
                        type="checkbox"
                        checked={isSelected(name, 'material')}
                        onChange={() => handleSelection(name, 'material', material)}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <div className="w-10 h-10 flex items-center justify-center bg-green-50 rounded-lg">
                        <Icon icon={material} className="text-green-600" width={24} height={24} />
                      </div>
                      <div className="text-[10px] text-gray-400">Material</div>
                    </div>

                    {/* Solar Icon */}
                    <div className="flex flex-col items-center gap-1 flex-shrink-0 w-[70px]">
                      <input
                        type="checkbox"
                        checked={isSelected(name, 'solar')}
                        onChange={() => handleSelection(name, 'solar', solar)}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <div className="w-10 h-10 flex items-center justify-center bg-purple-50 rounded-lg">
                        <Icon icon={solar} className="text-purple-600" width={24} height={24} />
                      </div>
                      <div className="text-[10px] text-gray-400">Solar</div>
                    </div>

                    {/* Tabler Icon */}
                    <div className="flex flex-col items-center gap-1 flex-shrink-0 w-[70px]">
                      <input
                        type="checkbox"
                        checked={isSelected(name, 'tabler')}
                        onChange={() => handleSelection(name, 'tabler', tabler)}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <div className="w-10 h-10 flex items-center justify-center bg-indigo-50 rounded-lg">
                        <Icon icon={tabler} className="text-indigo-600" width={24} height={24} />
                      </div>
                      <div className="text-[10px] text-gray-400">Tabler</div>
                    </div>

                    {/* Mingcute Icon */}
                    <div className="flex flex-col items-center gap-1 flex-shrink-0 w-[70px]">
                      <input
                        type="checkbox"
                        checked={isSelected(name, 'mingcute')}
                        onChange={() => handleSelection(name, 'mingcute', mingcute)}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <div className="w-10 h-10 flex items-center justify-center bg-pink-50 rounded-lg">
                        <Icon icon={mingcute} className="text-pink-600" width={24} height={24} />
                      </div>
                      <div className="text-[10px] text-gray-400">Mingcute</div>
                    </div>

                    {/* Remix Icon */}
                    <div className="flex flex-col items-center gap-1 flex-shrink-0 w-[70px]">
                      <input
                        type="checkbox"
                        checked={isSelected(name, 'remix')}
                        onChange={() => handleSelection(name, 'remix', remix)}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <div className="w-10 h-10 flex items-center justify-center bg-yellow-50 rounded-lg">
                        <Icon icon={remix} className="text-yellow-600" width={24} height={24} />
                      </div>
                      <div className="text-[10px] text-gray-400">Remix</div>
                    </div>

                    {/* Bootstrap Icon */}
                    <div className="flex flex-col items-center gap-1 flex-shrink-0 w-[70px]">
                      <input
                        type="checkbox"
                        checked={isSelected(name, 'bootstrap')}
                        onChange={() => handleSelection(name, 'bootstrap', bootstrap)}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <div className="w-10 h-10 flex items-center justify-center bg-cyan-50 rounded-lg">
                        <Icon icon={bootstrap} className="text-cyan-600" width={24} height={24} />
                      </div>
                      <div className="text-[10px] text-gray-400">Bootstrap</div>
                    </div>

                    {/* Line MD Icon */}
                    {linemd && (
                      <div className="flex flex-col items-center gap-1 flex-shrink-0 w-[70px]">
                        <input
                          type="checkbox"
                          checked={isSelected(name, 'linemd')}
                          onChange={() => handleSelection(name, 'linemd', linemd)}
                          className="w-4 h-4 cursor-pointer"
                        />
                        <div className="w-10 h-10 flex items-center justify-center bg-teal-50 rounded-lg">
                          <Icon icon={linemd} className="text-teal-600" width={24} height={24} />
                        </div>
                        <div className="text-[10px] text-gray-400">Line MD</div>
                      </div>
                    )}

                    {/* SVG Spinner Icon (only for loading) */}
                    {spinner && (
                      <div className="flex flex-col items-center gap-1 flex-shrink-0 w-[70px]">
                        <input
                          type="checkbox"
                          checked={isSelected(name, 'spinner')}
                          onChange={() => handleSelection(name, 'spinner', spinner)}
                          className="w-4 h-4 cursor-pointer"
                        />
                        <div className="w-10 h-10 flex items-center justify-center bg-orange-50 rounded-lg">
                          <Icon icon={spinner} className="text-orange-600" width={24} height={24} />
                        </div>
                        <div className="text-[10px] text-gray-400">Spinner</div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        ))}

        {/* Export Section */}
        {Object.keys(selections).length > 0 && (
          <div className="mt-8 p-4 glass-panel">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-white">Your Selections ({Object.keys(selections).length})</h3>
              <button
                onClick={copyToClipboard}
                className="btn-apple btn-primary text-sm px-4 py-2"
              >
                Copy to Clipboard
              </button>
            </div>
            <pre className="bg-black/30 text-green-400 p-4 rounded-lg text-xs overflow-x-auto font-mono">
              {exportCode}
            </pre>
            <p className="text-xs text-gray-400 mt-2">
              Copy this and share it to proceed with the icon migration.
            </p>
          </div>
        )}

        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Summary</h3>
          <div className="text-sm text-gray-700 space-y-1">
            <p><strong>Total Icons:</strong> {iconComparisons.length}</p>
            <p><strong>Current:</strong> Phosphor React (phosphor-react)</p>
            <p><strong>Alternatives:</strong></p>
            <ul className="ml-6 list-disc">
              <li>Material Symbols (material-symbols:*-rounded)</li>
              <li>Solar Linear (solar:*-linear)</li>
              <li>Tabler Icons (tabler:*)</li>
              <li>Mingcute Line (mingcute:*-line)</li>
              <li>Remix Icon (ri:*-line)</li>
              <li>Bootstrap Icons (bi:*)</li>
              <li>Line MD (line-md:*) - animated icons, shown when available</li>
              <li>SVG Spinners (svg-spinners:*) - for loading states only</li>
            </ul>
            <p className="mt-3 text-xs text-gray-500">
              This comparison excludes GitHub and Google login icons as requested.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
