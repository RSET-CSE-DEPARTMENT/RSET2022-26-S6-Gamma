using System;

/// <summary>
/// Contract for all game tasks. Your TaskManager holds a list of IGameTask
/// and calls StartTask() / EndTask() without needing to know the specifics.
/// </summary>
public interface IGameTask
{
    void StartTask();
    void EndTask();

    event Action OnTaskCompleted;
    event Action OnTaskFailed;
}
