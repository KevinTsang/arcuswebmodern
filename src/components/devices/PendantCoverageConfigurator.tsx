/** Range-test guidance for care pendants, which have no settings of their own. */
export default function PendantCoverageConfigurator() {
  return (
    <div data-testid="pendant-coverage">
      <p className="text-sm font-medium text-swift mb-2">Test Your Coverage</p>
      <p className="text-sm text-coot mb-2">
        While the pendant can communicate with the hub from up to 130ft. away, results may vary based on the
        layout of your home. Press the button at the furthermost areas of the home.
      </p>
      <p className="text-sm text-coot">
        The device is out of range when you do not receive a notification for each button press. Consider adding
        Smart Plugs, which serve as range extenders, to increase coverage.
      </p>
    </div>
  );
}
