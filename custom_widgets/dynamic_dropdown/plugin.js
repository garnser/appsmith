function App() {
  const { useState, useEffect, useRef } = React;

  // Initialize state variables
  const [options, setOptions] = useState([]);
  const [selectedValues, setSelectedValues] = useState([]);
  const [isOpen, setIsOpen] = useState(false); // Dropdown visibility
  const [inputValue, setInputValue] = useState(''); // The value the user types in the input
  const [expanded, setExpanded] = useState(false); // Track if selected pills are expanded

  const containerRef = useRef(null);

  // Initialize state from Appsmith's model (dynamic_options and value)
  useEffect(() => {
    const dynamicOptions = appsmith.model.dynamic_options?.options || [];

    // Parse the value if it's a stringified array
    const parsedValue = typeof appsmith.model.value === 'string'
      ? JSON.parse(appsmith.model.value)  // Parse the stringified JSON value
      : appsmith.model.value || [];

    // Create a Set for unique values
    const optionsSet = new Set(dynamicOptions.map(opt => opt.toLowerCase())); // Using lowercase for case-insensitive comparison

    // Add any selectedValues that are not in dynamicOptions
    parsedValue.forEach(val => {
      if (!optionsSet.has(val.toLowerCase())) {
        dynamicOptions.push(val);
        optionsSet.add(val.toLowerCase());
      }
    });

    // Set options by mapping to label and value
    const combinedOptions = dynamicOptions.map(opt => ({ label: opt, value: opt }));
    setOptions(combinedOptions);
    setSelectedValues(parsedValue);  // Set the pre-selected values

    // Initialize selectedOptions in the model
    appsmith.updateModel({
      selectedOptions: parsedValue,  // Populate selectedOptions with the parsed value
      value: JSON.stringify(parsedValue),   // Ensure value is stringified if needed
      options: combinedOptions.map(opt => opt.value), // Store options as an array of values
    });
  }, []); // Empty dependency array ensures this runs once on mount

  // Collapse pills when clicking outside the widget
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setExpanded(false); // Collapse the selected pills when clicking outside
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Function to handle selection changes
  const handleSelectionChange = (updatedSelectedValues) => {
    setSelectedValues(updatedSelectedValues);
    setInputValue(''); // Clear the input field after an option is selected

    // Update the model with the user-selected values
    appsmith.updateModel({
      selectedOptions: updatedSelectedValues,  // Update selectedOptions with the new selection
      value: JSON.stringify(updatedSelectedValues), // Update value as stringified array
      options: options.map(opt => opt.value),     // Ensure options are stored as array of values
    });

    // Trigger the onOptionsChange event with the updated selectedOptions
    appsmith.triggerEvent('onOptionsChange', updatedSelectedValues);

    // Trigger an event when values change
    appsmith.triggerEvent('onValueChange');
  };

  // Function to toggle dropdown visibility
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  // Function to add a new option
  const handleAddOption = (newOption) => {
    const trimmedOption = newOption.trim();
    if (trimmedOption && !options.some(opt => opt.value.toLowerCase() === trimmedOption.toLowerCase())) {
      const updatedOptions = [...options, { label: trimmedOption, value: trimmedOption }];
      const updatedSelected = [...selectedValues, trimmedOption];
      setOptions(updatedOptions);
      setSelectedValues(updatedSelected);
      setInputValue(''); // Clear the input field after adding a new option

      // Update the model with the new option and selection
      appsmith.updateModel({
        selectedOptions: updatedSelected,  // Update selected options with the new selection
        value: JSON.stringify(updatedSelected), // Update value as stringified array
        options: updatedOptions.map(opt => opt.value), // Store options as an array of values
      });

      // Trigger the onOptionsChange event when a new option is added
      appsmith.triggerEvent('onOptionsChange', updatedSelected);

      // Trigger an event when values change
      appsmith.triggerEvent('onValueChange');
    }
  };

  // Function to filter options based on input value
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(inputValue.toLowerCase())
  );

  // Calculate if the +X pill is needed
  const visibleSelectedValues = expanded ? selectedValues : selectedValues.slice(0, 3);
  const remainingCount = selectedValues.length - 3;

  return (
    <div className="custom-multiselect-container" ref={containerRef}>
      {/* Render the header dynamically if provided */}
      {appsmith.model.header && (
        <div className="dropdown-header">
          <h4>{appsmith.model.header}</h4>  {/* Header changed to h4 */}
        </div>
      )}

      {/* Render the description beneath the header if provided */}
      {appsmith.model.description && (
        <div className="dropdown-description">
          <p>{appsmith.model.description}</p>  {/* Description rendering below the header */}
        </div>
      )}

      <div className="selected-tags" onClick={toggleDropdown}>
        {/* Display selected values (limit to 3 initially, expandable) */}
        {visibleSelectedValues.map(val => (
          <span key={val} className="selected-tag">
            {val}
            <span
              className="remove-tag"
              onClick={(e) => {
                e.stopPropagation(); // Prevent triggering toggleDropdown
                handleSelectionChange(selectedValues.filter(item => item !== val));
              }}
            >
              ×
            </span>
          </span>
        ))}

        {/* Show the +X pill if there are more than 3 selected values */}
        {remainingCount > 0 && !expanded && (
          <span
            className="selected-tag plus-pill"
            onClick={(e) => {
              e.stopPropagation(); // Prevent triggering toggleDropdown
              setExpanded(true);
            }}
          >
            +{remainingCount}
          </span>
        )}

        {/* Input field for typing directly in the dropdown field */}
        <input
          type="text"
          className="select-input"
          placeholder="Type to search or add..."
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            if (!isOpen) {
              setIsOpen(true); // Open the dropdown when user starts typing
            }
          }}
          onFocus={() => setIsOpen(true)} // Dropdown opens when input is focused
          onKeyDown={(e) => {
            if (e.key === 'Enter' && inputValue.trim() !== '') {
              handleAddOption(inputValue); // Add new option on Enter
            }
          }}
        />
      </div>

      {/* Display dropdown only when it's open */}
      {isOpen && (
        <div className="dropdown">
          {filteredOptions.length === 0 && inputValue.trim() !== '' ? (
            <div
              className="dropdown-item"
              onClick={() => handleAddOption(inputValue)}
            >
              Add "{inputValue}"
            </div>
          ) : (
            filteredOptions.map(option => (
              <label key={option.value} className="dropdown-item">
                <input
                  type="checkbox"
                  checked={selectedValues.includes(option.value)}
                  onChange={() => {
                    const updatedSelected = selectedValues.includes(option.value)
                      ? selectedValues.filter(item => item !== option.value)
                      : [...selectedValues, option.value];
                    handleSelectionChange(updatedSelected); // Update selection
                  }}
                />
                <span>{option.label}</span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}

appsmith.onReady(() => {
  ReactDOM.render(<App />, document.getElementById('root'));
});
