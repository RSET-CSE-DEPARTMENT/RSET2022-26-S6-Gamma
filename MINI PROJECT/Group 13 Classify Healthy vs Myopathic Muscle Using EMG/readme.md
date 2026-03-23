Our project was mainly research oriented ,  with the goal to find out how electromyogrpahy (EMG) signals can be used to distinguish between a healthy and myopathic muscle.
We followed two approaches one was performing 1.)Quantitative Analysis and other was 2.)Model Training . In the first approch we performed feature extraction on EMG signals , 
the codes of which are provided here. After which we plotted  the features extracted of healthy and myopathic patients to analyze any differences 
Unfortunaltely we could not come to any inference or observe any notable distinctions .
Then we moved onto Model Training where we trained a Random Forest Model (which was chosen because of the limited dataset we had ) on feature extracted data. The model showed significant accuracy in distinguishing between healthy vs myopathic EMG.
