import os
import logging

def setup_agent_logger(name="HospitalAgent", log_folder="./dataset", log_file="agent_log.txt"):
    """Configures a logger that writes to both a file and the console."""
    
    # 1. Ensure the directory exists
    if not os.path.exists(log_folder):
        os.makedirs(log_folder)
    
    log_path = os.path.join(log_folder, log_file)

    # 2. Create Logger
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)

    # Prevent duplicate handlers if imported multiple times
    if not logger.handlers:
        # 3. Create Formatter
        formatter = logging.Formatter('%(asctime)s | %(levelname)s | %(message)s', 
                                      datefmt='%Y-%m-%d %H:%M:%S')

        # 4. File Handler (Appends to the log file)
        file_handler = logging.FileHandler(log_path, encoding='utf-8')
        file_handler.setFormatter(formatter)

        # 5. Console Handler (Displays in Terminal)
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)

        # 6. Add handlers to logger
        logger.addHandler(file_handler)
        logger.addHandler(console_handler)

    return logger