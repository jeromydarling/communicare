// =============================================================================
// testimonials — real, attributed, no marketing quotes
// =============================================================================
// Rule: nothing lands here that a real farmer didn't say on the record.
// If the list is empty the landing page skips the section entirely
// rather than showing a placeholder. Better silent than hollow.
// =============================================================================

export type Testimonial = {
  quote: string;
  farmer: string;
  farm: string;
  location: string;
  /** Optional public URL to the farm's page (theirs, or their Communicare listing). */
  href?: string;
};

export const testimonials: Testimonial[] = [
  // Add real testimonials here as they come in. Format:
  //
  // {
  //   quote: "One clear sentence in their voice.",
  //   farmer: "First Last",
  //   farm: "Farm Name",
  //   location: "Town, State",
  //   href: "https://theirfarm.com",
  // },
];
