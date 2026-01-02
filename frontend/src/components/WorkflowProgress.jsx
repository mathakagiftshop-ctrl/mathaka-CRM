import { Check, User, Package, MapPin, FileText } from 'lucide-react';

export default function WorkflowProgress({ currentStep, steps }) {
  const defaultSteps = [
    { id: 'customer', label: 'Customer', icon: User },
    { id: 'delivery', label: 'Delivery', icon: MapPin },
    { id: 'packages', label: 'Packages', icon: Package },
    { id: 'review', label: 'Review', icon: FileText },
  ];

  const stepsToShow = steps || defaultSteps;

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
      <div className="flex items-center justify-between">
        {stepsToShow.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const Icon = step.icon;

          return (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isCompleted
                      ? 'bg-green-500 text-white'
                      : isCurrent
                        ? 'bg-crm-primary text-white ring-4 ring-crm-accent/30'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                >
                  {isCompleted ? <Check size={20} /> : <Icon size={20} />}
                </div>
                <span
                  className={`text-xs mt-1 font-medium ${isCompleted
                      ? 'text-green-600'
                      : isCurrent
                        ? 'text-crm-primary font-bold'
                        : 'text-gray-400'
                    }`}
                >
                  {step.label}
                </span>
              </div>
              {index < stepsToShow.length - 1 && (
                <div
                  className={`w-12 sm:w-20 h-1 mx-2 rounded ${isCompleted ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
