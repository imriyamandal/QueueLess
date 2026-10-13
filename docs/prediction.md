# Adaptive Waiting Intelligence Engine (AWIE)

## 1. Problem Definition
Traditional queue management displays static or naive waiting estimates (e.g., `position * average_duration`), which fails because:
1. Multiple counters operate in parallel with heterogeneous capabilities.
2. Active services are partially completed.
3. Counters pause for breaks, switch offline, or change service assignments.
4. Visitors cancel or no-show, compressing the queue unexpectedly.
5. Service durations follow skewed, non-normal distributions (log-normal or gamma).

## 2. Core Scheduling Simulation Algorithm
Instead of naive division, AWIE runs a **Discrete Counter Availability Simulation**:

### Step 1: Active Counter State Projection
For each active eligible counter $c \in C_{\text{active}}$:
- If counter is `PAUSED` or `OFFLINE`: Projected availability time $T_c = \infty$ (or until unpaused).
- If counter is `AVAILABLE`: $T_c = 0$ (ready immediately).
- If counter is `BUSY` with ticket $t_{\text{active}}$:
  - Let $t_{\text{elapsed}} = \text{now} - \text{start\_time}$.
  - Expected remaining time: $\widehat{R} = \max\left(0.1 \times \mu_{\text{service}}, \mu_{\text{service}} - t_{\text{elapsed}}\right)$ where $\mu_{\text{service}}$ is the empirical rolling mean duration for that service.
  - $T_c = \widehat{R}$.

### Step 2: Queue Progression Simulation
Let $Q_{\text{ahead}} = [e_1, e_2, \dots, e_k]$ be the ordered list of waiting entries ahead of the target ticket $T_{\text{target}}$ (sorted by Priority descending, then Join Time ascending):
For each entry $e_i$:
1. Find eligible counters $C_{e_i} \subseteq C_{\text{active}}$.
2. Select the earliest available counter: $c^* = \arg\min_{c \in C_{e_i}} T_c$.
3. Assign entry $e_i$ to $c^*$ and update its projected availability:
   $$T_{c^*} \leftarrow T_{c^*} + \mu_{\text{service}}(e_i)$$

### Step 3: Target Ticket Estimated Wait
When the target ticket $T_{\text{target}}$ is reached:
$$\widehat{W} = \min_{c \in C_{\text{target}}} T_c$$
Where $\widehat{W}$ is the estimated waiting time in seconds until service starts.

## 3. Uncertainty Estimation (P10 - P90 Confidence Range)
Service durations have variance $\sigma^2$. For $N$ entries served ahead across $M$ active counters:
- Standard Error of the estimated wait:
  $$SE = \sqrt{\sum \sigma_i^2 / M_{\text{eff}}}$$
- Lower bound (P10):
  $$W_{\text{lower}} = \max\left(1, \widehat{W} - 1.28 \times SE\right)$$
- Upper bound (P90):
  $$W_{\text{upper}} = \widehat{W} + 1.28 \times SE + \text{buffer}_{\text{interruption}}$$

If active counters drop (e.g. counter paused), $M_{\text{eff}}$ decreases and upper bound automatically expands with a transparent explanation: `"Counter #2 paused: capacity reduced"`.

## 4. Return Recommendation
Given travel time $t_{\text{travel}}$ entered by visitor (default: 5 min) and facility safety buffer $t_{\text{buffer}}$ (default: 5 min):
$$\text{Recommended Departure} = \text{Current Time} + \max\left(0, W_{\text{lower}} - t_{\text{travel}} - t_{\text{buffer}}\right)$$

## 5. Evaluation & Continuous Calibration
- Every prediction generates an immutable `PredictionSnapshot` record with timestamp, estimated wait, and bounds.
- Upon ticket service start (`IN_SERVICE`), the actual wait is recorded.
- System continuously evaluates:
  1. **MAE (Mean Absolute Error)**: $\frac{1}{N} \sum |\widehat{W}_i - W_{\text{actual}, i}|$
  2. **Prediction Coverage %**: Percentage of actual waits falling between $[W_{\text{lower}}, W_{\text{upper}}]$ (target: $\ge 80\%$).
